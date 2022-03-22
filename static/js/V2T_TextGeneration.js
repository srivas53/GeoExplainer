'use strict'; /* globals V2T */
(function(){
    class TextGeneration extends V2T.Base {
        constructor(){
            super();
            this.dependent_y = "";
            this.current_x_layer = "";
            this.X_list = [];
            this.geojsonObj = {};
            this.generalTextNotationObj = {};

            this.cooksD_threshold;
            this.report_ID = 0;

        }

        getNotationObj(notation_name){
            return this.generalTextNotationObj[notation_name];
        }

        doCalculation(numbers, digit = 2) {
            // fix float errors in JS
            const formulaCalc = function formulaCalc(formula, digit) {
                let pow = Math.pow(10, digit);
                return parseInt(formula * pow, 10) / pow;
            };
            let len = numbers.length;
            let sum = (a, b) => formulaCalc(a + b, digit);
            let max = Math.max.apply(null, numbers);
            let min = Math.min.apply(null, numbers);
            // get average
            let avg = numbers.reduce(sum) / len;

            // get median
            // sorting array in ascending order
            let sequence = [].concat(numbers).sort((a,b) => b-a);

            max = parseFloat(max.toFixed(digit));
            min = parseFloat(min.toFixed(digit));
            avg = parseFloat(avg.toFixed(digit));

            return {
                max,
                min,
                avg
            }
        }

        /* geo distribution location transform */
        getGeoLocation(coordList){
            let NWSE_bounds = visualCalibrationInterface.NWSE_bounds;
            let transformed_arr = [];
            $.each(coordList, (i,e) => {
                let long = e[0];
                let lat = e[1];
                // WEST
                if(long < NWSE_bounds.west_bound){
                    //SW
                    if(lat < NWSE_bounds.south_bound){
                        transformed_arr[i] = 'southwest';
                    }else if(lat > NWSE_bounds.north_bound){ // NW
                        transformed_arr[i] = 'northwest';
                    }else{ // MW
                        transformed_arr[i] = 'west';
                    }
                }else if(long > NWSE_bounds.east_bound){ // EAST
                    //SE
                    if(lat < NWSE_bounds.south_bound){
                        transformed_arr[i] = 'southeast';
                    }else if(lat > NWSE_bounds.north_bound){ // NE
                        transformed_arr[i] = 'northeast';
                    }else{ // ME
                        transformed_arr[i] = 'east';
                    }
                }else{ // MIDDLE
                    //MS
                    if(lat < NWSE_bounds.south_bound){
                        transformed_arr[i] = 'south';
                    }else if(lat > NWSE_bounds.north_bound){ // MN
                        transformed_arr[i] = 'north';
                    }else{ // MIDDLE
                        transformed_arr[i] = 'middle';
                    }
                }
            });
            //console.log(transformed_arr);
            return transformed_arr;
        }

        /* count place distributions */
        getWordCount(arr){
                return arr.reduce(function(prev,next){
                prev[next] = (prev[next] + 1) || 1;
                return prev;
                },{});
        }

        /* return list of isolated place */
        getIsolatedPlace(places_list, name_list){
            let single_place = [];
            //single place
            for(let i = 0; i<places_list.length;i++){
                let temp_arr = places_list.concat();
                let remove_element = temp_arr[i];
                temp_arr.splice(i,1);
                if(temp_arr.indexOf(remove_element) === -1){
                    single_place.push(name_list[i]);
                }
            }
            return single_place;
        }

        /* generate annotations from CSV result of MGWR */
        generateNotationFromCSV(model_result){
            this.dependent_y = model_result.Y;
            this.X_list = model_result.X;
            this.geojsonObj = model_result['geojson_point'];

            this.generateOlsResidultNotation(model_result.ols_residual);
            this.generateMGWRResidultNotation(model_result.mgwr_residual);

            //generate coefficient description
            $.each(this.X_list, (i,e) => {
                this.generateCSVCoefficientText(e);
            });

            this.generateCSVCoefficientText('intercept');
        }

        generateCSVCoefficientText(xName){
            let Y = modelFromCSV.dependent_y;
            let X = xName;
            let coefficient_tval = X+'_tval';
            let coefficient = X+'_coefficient';
            let jsonData = this.geojsonObj.features.concat();
            let intro = {
                text: "The spatial distribution of the parameter estimates for the particular case of the <b>"+X+" variable</b>",
                hasList: false,
                type: 'intro_coefficient'
            };
            let place_name = 'counties';
            let place_name_s = 'county';
            let significantCoeff = [];
            let significantCoeff_coord = [];
            let positive_places = [];
            let negative_places = [];
            let positive_coord_list = [];
            let negative_coord_list = [];
            let posi_coeff_val = [];
            let neg_coeff_val = [];
            $.each(jsonData, (i,e) => {
                if(e.properties[coefficient_tval] !== 0){
                    significantCoeff.push(e.properties.county_name);
                    significantCoeff_coord.push(e.geometry.coordinates);
                    if(e.properties[coefficient] > 0){
                        positive_places.push(e.properties.county_name);
                        positive_coord_list.push(e.geometry.coordinates);
                        posi_coeff_val.push(e.properties[coefficient]);
                    }else if(e.properties[coefficient] < 0){
                        negative_places.push(e.properties.county_name);
                        negative_coord_list.push(e.geometry.coordinates);
                        neg_coeff_val.push(e.properties[coefficient]);
                    }
                }
            });

            /* generate descriptive text that will be used in text report */
            let text_output = [];
            text_output.push(intro);

            let conclusion = "Based on the T-test results, the impact of <b>"+X+"</b> is statistically significant inside shaded areas. " +
                "The gray areas indicate regions where this attribute has no impact on the <b>"+Y+"</b>";
            let conclusion_output = {
                text: conclusion,
                hasList: false,
                type: 'conclusion_coefficient'
            };
            text_output.push(conclusion_output);

            if(positive_coord_list.length > 0){
                let good_distribution_list = this.getGeoLocation(positive_coord_list);
                let posotive_places_list = this.getWordCount(good_distribution_list);
                let single_positive_place = this.getIsolatedPlace(good_distribution_list, positive_places);
                let propotion = 100 * positive_coord_list.length / jsonData.length;
                propotion = parseFloat(propotion.toFixed(2));
                let distribution = this.doCalculation(posi_coeff_val);

                let positive_text = 'There are ';

                $.each(posotive_places_list, (key,num)=>{
                    // when number > 2
                    if(num > 1)
                        positive_text += num + ' ' + place_name +' in '+key+', ';
                });
                // list single place
                if(single_positive_place.length > 0){
                    positive_text += 'and ' + place_name_s + ' ';
                    $.each(single_positive_place, (i, e)=>{
                        positive_text += e + ', '
                    });
                }
                positive_text += 'where the <b>positive relationship is significant in '+propotion+'% of the study area.</b> ' +
                    'The statistically significant local coefficients range from <b>'+distribution['min']+' to '+distribution['max']+
                    '</b>, with a mean value equal to <b>'+distribution['avg']+'</b>.';

                let positive_output = {
                    text: positive_text,
                    hasList: false,
                    type: 'positive_coefficient'
                };
                text_output.push(positive_output);
            }

            if (negative_coord_list.length > 0){
                let bad_distribution_list = this.getGeoLocation(negative_coord_list);
                let negative_places_list = this.getWordCount(bad_distribution_list);
                let single_negative_place = this.getIsolatedPlace(bad_distribution_list, negative_places);
                let propotion = 100 * negative_coord_list.length / jsonData.length;
                propotion = parseFloat(propotion.toFixed(2));
                let distribution = this.doCalculation(neg_coeff_val);

                let negative_text = 'There are ';

                $.each(negative_places_list, (key,num)=>{
                    // when number > 2
                    if(num > 1)
                        negative_text += num + ' ' + place_name +' in '+key+', ';
                });
                // list single place
                if(single_negative_place.length > 0){
                    negative_text += 'and ' + place_name_s + ' ';
                    $.each(single_negative_place, (i, e)=>{
                        negative_text += e + ', '
                    });
                }
                negative_text += 'where the <b>negative relationship is significant in '+propotion+'% of the study area.</b> ' +
                    'The statistically significant local coefficients range from <b>'+distribution['min']+' to '+distribution['max']+
                    '</b>, with a mean value equal to <b>'+distribution['avg']+'</b>.';

                let negative_output = {
                    text: negative_text,
                    hasList: false,
                    type: 'negative_coefficient'
                };
                text_output.push(negative_output);
            }
            //console.log(text_output);
            this.generalTextNotationObj[X+'_general'] = text_output;

        }

        generateOlsResidultNotation(results){
            let Y = modelFromCSV.dependent_y;
            let intro = {
                text: "The spatial distribution of the residuals for the global ordinary least squares model. " +
                    "The expected value of Moran’s I if the distribution were random is <b>0.0003</b> and the observed value is <b>0.287</b> with a p value 0 in 95% confidence intervals.",
                hasList: false,
                type: 'intro_residual'
            };
            //  "while the negative values are associated with regions where the value was found lower than expected. ";
            let threshold = 0;
            let high_places = [];
            let low_places = [];
            $.each(this.geojsonObj.features, (i, e)=>{
                if(e.properties.ols_residual > threshold){
                    high_places.push(e.properties.county_name);
                }else if(e.properties.ols_residual < threshold){
                    low_places.push(e.properties.county_name);
                }
            });
            /* generate descriptive text that will be used in text report */
            let text_output = [];
            text_output.push(intro);

            let final_content = "The residuals <b>exhibit strong spatial dependency</b>, which invalidates the inferences made from the model training results.";
            let final_output = {
                text: final_content,
                hasList: false,
                type: 'conclusion_residual'
            };
            text_output.push(final_output);
            this.generalTextNotationObj['ols_residual_general'] = text_output;
        }

        generateMGWRResidultNotation(results){
            let Y = modelFromCSV.dependent_y;
            let intro = {
                text: "The spatial distribution of the residuals for the multiscale geographically weighted regression model (MGWR). " +
                    "The expected value of Moran’s I if the distribution were random is <b>0.0003</b> and the observed value is <b>0.006</b> with a p value of 0.109 in 95% confidence intervals.",
                hasList: false,
                type: 'intro_residual'
            };
            //  "while the negative values are associated with regions where the value was found lower than expected. ";
            let threshold = 0;
            let high_places = [];
            let low_places = [];
            $.each(this.geojsonObj.features, (i, e)=>{
                if(e.properties.mgwr_residual > threshold){
                    high_places.push(e.properties.county_name);
                }else if(e.properties.mgwr_residual < threshold){
                    low_places.push(e.properties.county_name);
                }
            });
            /* generate descriptive text that will be used in text report */
            let text_output = [];
            text_output.push(intro);

            let final_content = "There is <b>no clear (systematic) pattern of over or under prediction in the study area</b>. " +
                "That indicates the model works well without missing any key explanatory variables.";
            let final_output = {
                text: final_content,
                hasList: false,
                type: 'conclusion_residual'
            };
            text_output.push(final_output);
            this.generalTextNotationObj['mgwr_residual_general'] = text_output;
        }

        /* entrance of text generation */
        generateGeneralTextNotation(model_result){
            this.dependent_y = model_result.Y;
            this.X_list = model_result.X;
            this.geojsonObj = model_result['geojson_point'];
            // generate global description of local R2
            this.generateGlobalLocalR2Text(model_result.local_R2);
            this.generateGlobalCooksDText(model_result.cooksD);
            this.generateGlobalResidualText(model_result.std_residuals);

            //generate coefficient description
            $.each(this.X_list, (i,e) => {
                this.generateGlobalCoefficientText(e);
            });

            //generate intercept description
            this.generateGlobalCoefficientText('intercept');
        }

        /* generate global description of coefficients */
        generateGlobalCoefficientText(xName){
            let Y = modelAnalysisInterface.dependent_y;
            let X = xName;
            let coefficient_tval = X+'_tval';
            let coefficient = X+'_coefficient';
            let jsonData = this.geojsonObj.features.concat();
            let intro = {
                text: "The spatial distribution of the parameter estimates for the particular case of the <b>"+X+" variable</b>",
                hasList: false,
                type: 'intro_coefficient'
            };
            let place_name = visualCalibrationInterface.place_name;
            let place_name_s = visualCalibrationInterface.place_name_single;
            let significantCoeff = [];
            let significantCoeff_coord = [];
            let positive_places = [];
            let negative_places = [];
            let positive_coord_list = [];
            let negative_coord_list = [];
            let posi_coeff_val = [];
            let neg_coeff_val = [];
            $.each(jsonData, (i,e) => {
                if(e.properties[coefficient_tval] !== 0){
                    significantCoeff.push(e.properties.county_name);
                    significantCoeff_coord.push(e.geometry.coordinates);
                    if(e.properties[coefficient] > 0){
                        positive_places.push(e.properties.county_name);
                        positive_coord_list.push(e.geometry.coordinates);
                        posi_coeff_val.push(e.properties[coefficient]);
                    }else if(e.properties[coefficient] < 0){
                        negative_places.push(e.properties.county_name);
                        negative_coord_list.push(e.geometry.coordinates);
                        neg_coeff_val.push(e.properties[coefficient]);
                    }
                }
            });

            /* generate descriptive text that will be used in text report */
            let text_output = [];
            text_output.push(intro);

            let conclusion = "The impact of <b>"+X+"</b> is statistically significant around colored areas. " +
                "The gray areas indicate regions where this attribute has no impact on the <b>"+Y+"</b>";
            let conclusion_output = {
                text: conclusion,
                hasList: false,
                type: 'conclusion_coefficient'
            };
            text_output.push(conclusion_output);

            if(positive_coord_list.length > 0){
                let good_distribution_list = this.getGeoLocation(positive_coord_list);
                let posotive_places_list = this.getWordCount(good_distribution_list);
                let single_positive_place = this.getIsolatedPlace(good_distribution_list, positive_places);
                let propotion = 100 * positive_coord_list.length / jsonData.length;
                propotion = parseFloat(propotion.toFixed(2));
                let distribution = this.doCalculation(posi_coeff_val);

                let positive_text = 'There are ';

                $.each(posotive_places_list, (key,num)=>{
                    // when number > 2
                    if(num > 1)
                        positive_text += num + ' ' + place_name +' in '+key+', ';
                });
                // list single place
                if(single_positive_place.length > 0){
                    positive_text += 'and ' + place_name_s + ' ';
                    $.each(single_positive_place, (i, e)=>{
                        positive_text += e + ', '
                    });
                }
                positive_text += 'where the <b>positive relationship is significant in '+propotion+'% of the study area.</b> ' +
                    'The statistically significant local coefficients range from <b>'+distribution['min']+' to '+distribution['max']+
                    '</b>, with a mean value equal to <b>'+distribution['avg']+'</b>.';

                let positive_output = {
                    text: positive_text,
                    hasList: false,
                    type: 'positive_coefficient'
                };
                text_output.push(positive_output);
            }

            if (negative_coord_list.length > 0){
                let bad_distribution_list = this.getGeoLocation(negative_coord_list);
                let negative_places_list = this.getWordCount(bad_distribution_list);
                let single_negative_place = this.getIsolatedPlace(bad_distribution_list, negative_places);
                let propotion = 100 * negative_coord_list.length / jsonData.length;
                propotion = parseFloat(propotion.toFixed(2));
                let distribution = this.doCalculation(neg_coeff_val);

                let negative_text = 'There are ';

                $.each(negative_places_list, (key,num)=>{
                    // when number > 2
                    if(num > 1)
                        negative_text += num + ' ' + place_name +' in '+key+', ';
                });
                // list single place
                if(single_negative_place.length > 0){
                    negative_text += 'and ' + place_name_s + ' ';
                    $.each(single_negative_place, (i, e)=>{
                        negative_text += e + ', '
                    });
                }
                negative_text += 'where the <b>negative relationship is significant in '+propotion+'% of the study area.</b> ' +
                    'The statistically significant local coefficients range from <b>'+distribution['min']+' to '+distribution['max']+
                    '</b>, with a mean value equal to <b>'+distribution['avg']+'</b>.';

                let negative_output = {
                    text: negative_text,
                    hasList: false,
                    type: 'negative_coefficient'
                };
                text_output.push(negative_output);
            }
            //console.log(text_output);
            this.generalTextNotationObj[X+'_general'] = text_output;

        }

        /* generate global description of std residuals */
        generateGlobalResidualText(std_residuals){
            let Y = modelAnalysisInterface.dependent_y;
            let moran_val = std_residuals.moran;
            let intro = {
                text: "The spatial distribution of the model residuals between the predicted and observed <b>" + Y+"</b>",
                hasList: false,
                type: 'intro_residual'
            };
              //  "while the negative values are associated with regions where the value was found lower than expected. ";
            let threshold = 0;
            let high_places = [];
            let low_places = [];
            $.each(this.geojsonObj.features, (i, e)=>{
                if(e.properties.std_residuals > threshold){
                    high_places.push(e.properties.county_name);
                }else if(e.properties.std_residuals < threshold){
                    low_places.push(e.properties.county_name);
                }
            });
            /* generate descriptive text that will be used in text report */
            let text_output = [];
            text_output.push(intro);
            let high_content = "Positive values of residuals stand for those regions where the predicted values are higher than expected.";
            let high_output = {
                text: high_content,
                hasList: true,
                type: 'over_residual',
                places: high_places
            };
            text_output.push(high_output);

            let low_content = "While the negative values are associated with regions where the value was found lower than expected.";
            let low_output = {
                text: low_content,
                hasList: true,
                type: 'under_residual',
                places: low_places
            };
            text_output.push(low_output);

            /* give Moran's I test values */
            let moran_content = "The expected value of Moran’s I if the distribution were random is <b>"
                                +moran_val.moran_EI+"</b> and the observed value is <b>"
                                +moran_val.moran_I+"</b> with a p value of <b>"
                                +moran_val.moran_p+"</b> in 95% confidence intervals.";
            let moran_output = {
                text: moran_content,
                hasList: false,
                type: 'moran_residual'
            };
            text_output.push(moran_output);

            let final_content = "There is <b>no clear (systematic) pattern of over or under prediction in the study area</b>. " +
                "That indicates the model works good without missing any key explanatory variables.";
            let final_output = {
                text: final_content,
                hasList: false,
                type: 'conclusion_residual'
            };
            text_output.push(final_output);
            this.generalTextNotationObj['std_residuals_general'] = text_output;
        }

        /* generate global description of cooks' distance */
        generateGlobalCooksDText(cooksD){
            let intro = {
                text: "The spatial distributions of Cook's Distance.",
                hasList: false,
                type: 'intro_CooksD'
            };
            let threshold = 4 / cooksD.value.length;
            this.cooksD_threshold = threshold;
            let max = cooksD.max;
            let outliers_place = [];
            let place_name = visualCalibrationInterface.place_name;
            let place_name_s = visualCalibrationInterface.place_name_single;
            let outliers_coord_list = [];
            $.each(this.geojsonObj.features, (i, e)=>{
                if(e.properties.cooksD > threshold){
                    outliers_place.push(e.properties.county_name);
                    outliers_coord_list.push(e.geometry.coordinates);
                }
            });
            let cooksD_distribution_list = this.getGeoLocation(outliers_coord_list);
            let high_cooksD_places = this.getWordCount(cooksD_distribution_list);
            let single_outlier_place = this.getIsolatedPlace(cooksD_distribution_list, outliers_place);

            /* generate descriptive text that will be used in text report */
            let text_output = [];
            /* integrate text content */
            let outlier_content = "There are ";
            $.each(high_cooksD_places, (key,num)=>{
                // when number > 2
                if(num > 1)
                    outlier_content += num + ' ' + place_name +' in '+key+', ';
            });
            // list single place
            if(single_outlier_place.length > 0){
                outlier_content += 'and ' + place_name_s + ' ';
                $.each(single_outlier_place, (i, e)=>{
                    outlier_content += e + ', '
                });
            }
            outlier_content += "their Cook\'s Distances are detected <b>above the threshold and those places are considered as influential outliers.</b> ";
            outlier_content += "Areas list above are particularly <b>worth checking for validity.</b>";

            text_output.push(intro);
            let outlier_output = {
                text: outlier_content,
                hasList: true,
                type: 'cooksD_notation',
                places: outliers_place
            };
            text_output.push(outlier_output);

            this.generalTextNotationObj['cooksD_general'] = text_output;

        }

        /* generate global description of local R2 */
        generateGlobalLocalR2Text(local_R2){
            //console.log('Global text generation part');
            let intro = {
                text: "The spatial distributions of local R2 values.",
                hasList: false,
                type: 'intro_R2'
            };
            let max = local_R2.max;
            let median = local_R2.median;
            let mean = local_R2.mean;
            let min = local_R2.min;
            let upper_threshold = (max + median) / 2;
            let lower_threshold = (min + median) / 2;
            let good_places = [];
            let bad_places = [];
            let place_name = visualCalibrationInterface.place_name;
            let place_name_s = visualCalibrationInterface.place_name_single;
            let good_coord_list = [];
            let bad_coord_list = [];

            if(upper_threshold > 0){
                // get places that with the value above the upper threshold
                $.each(this.geojsonObj.features, (i, e)=>{
                    if(e.properties.local_R2 > upper_threshold){
                        good_places.push(e.properties.county_name);
                        good_coord_list.push(e.geometry.coordinates);
                    }else if(e.properties.local_R2 < lower_threshold){
                        bad_places.push(e.properties.county_name);
                        bad_coord_list.push(e.geometry.coordinates);
                    }
                });
            }else if(max > 0){
                $.each(this.geojsonObj.features, (i, e)=>{
                    if(e.properties.local_R2 >= max){
                        good_places.push(e.properties.county_name);
                        good_coord_list.push(e.geometry.coordinates);
                    }else if(e.properties.local_R2 < lower_threshold){
                        bad_places.push(e.properties.county_name);
                        bad_coord_list.push(e.geometry.coordinates);
                    }
                });
            }

            let good_distribution_list = this.getGeoLocation(good_coord_list);
            let good_R2_places = this.getWordCount(good_distribution_list);
            let single_good_place = this.getIsolatedPlace(good_distribution_list, good_places);

            let bad_distribution_list = this.getGeoLocation(bad_coord_list);
            let bad_R2_places = this.getWordCount(bad_distribution_list);
            let single_bad_place = this.getIsolatedPlace(bad_distribution_list, bad_places);

            /* generate descriptive text that will be used in text report */
            let text_output = [];
            // good R2 part
            let good_perform = 'There are ';
            $.each(good_R2_places, (key,num)=>{
                // when number > 2
                if(num > 1)
                    good_perform += num + ' ' + place_name +' in '+key+', ';
            });
            // list single place
            if(single_good_place.length > 0){
                good_perform += 'and ' + place_name_s + ' ';
                $.each(single_good_place, (i, e)=>{
                    good_perform += e + ', '
                });
            }
            good_perform += 'had <b>high local R2 value. Indicating a decent prediction of the model</b> in these areas.';
            //console.log(good_perform);
            text_output.push(intro);
            let good_output = {
                text: good_perform,
                hasList: true,
                type: 'good_R2',
                places: good_places
            };
            text_output.push(good_output);
            // bad R2 part
            let bad_perform = 'On the contrary, the local R2 values were low around ';
            $.each(bad_R2_places, (key,num)=>{
                // when number > 2
                if(num > 1)
                    bad_perform += num + ' ' + place_name +' in '+key+', ';
            });
            // list single place
            if(single_bad_place.length > 0){
                bad_perform += 'and ' + place_name_s + ' ';
                $.each(single_bad_place, (i, e)=>{
                    bad_perform += e + ', '
                });
            }
            bad_perform += 'indicating the <b>poor performance of the model across these counties.</b>';
            let bad_output = {
                text: bad_perform,
                hasList: true,
                type: 'bad_R2',
                places: bad_places
            };
            text_output.push(bad_output);
            //console.log(text_output);
            /* TODO: Generate HTML code here or at ModelAnalysis.js ? - Here */

            this.generalTextNotationObj['local_R2_general'] = text_output;
        }

        renderReportParagraph(HTML_content){
            let modelFromCSV = this;
            let report_container = $('#text_report_content_new');
            let text_paragraph = $(`
                 <div class="report_paragraph" id=${this.report_ID}>${HTML_content}</div>
            `);
            report_container.append(text_paragraph);
            this.report_ID = this.report_ID +1;

            function divClicked() {
                var divHtml = $(this).html();
                var editableText = $("<textarea style='width: 100%; min-height: 100px;' />");
                editableText.val(divHtml);
                $(this).replaceWith(editableText);
                editableText.focus();
                // setup the blur event for this new textarea
                editableText.blur(editableTextBlurred);
            }

            function editableTextBlurred() {
                var html = $(this).val();
                var viewableText = $("<p>");
                viewableText.html(html);
                $(this).replaceWith(viewableText);
                // setup the click event for this new div
                $(viewableText).dblclick(divClicked);
            }

            $(".report_paragraph p").dblclick(divClicked);

            /* double click to delete map screenshot in report panel */
            $(".report_paragraph img").dblclick(function(){
                console.log('clicked');
                $(this).parent().remove();
            });
        }

        /* Render external info in a panel */
        renderExternalInfo(external_data){
            $('#external_info_content').empty();
            //console.log(external_data);
            let HTML = "<div id=\"accordion\">";
            $.each(external_data, (key, element) => {
                if(key === 'introduction'){
                    HTML += "<h3>"+key+"</h3>";
                    HTML += "<div style=\"max-height: 140px; overflow: auto;\"><p class='external_content'>";
                    HTML += element;
                    HTML += "</p></div>";
                }else if(key !== 'county_name' && key !== 'state_name'){
                    if(element['content'] !== ""){
                        HTML += "<h3>"+key+"</h3>";
                        HTML += "<div style=\"max-height: 140px; overflow: auto;\"><p>";
                        HTML += element['content'];
                        HTML += "</p></div>";
                    }else if(element['content'] === "" && element['has_sub'] === 1){
                        HTML += "<h3>"+key+"</h3>";
                        HTML += "<div style=\"max-height: 140px; overflow: auto;\">";
                        $.each(element['sub_section'], (i,e) => {
                            if(e['content'] !== ""){
                                HTML += "<h6>"+e['title']+"</h6>";
                                HTML += "<p>"+ e['content'] +"</p>"
                            }
                        });
                        HTML += "</div>";
                    }
                }
            });
            HTML += "</div>";
            $('#external_info_content').append(HTML);
            $( "#accordion" ).accordion({
                heightStyle: "content"
            });

            /* Using Rangy to select text from external info panel */
            let button = document.getElementById('copy_external_btn');
            button.type = "button";
            button.unselectable = true;
            button.className = "unselectable external_menu";
            button.ontouchstart = button.onmousedown = function() {
                let mytext = x.Selector.getSelected();
                let HTML = '<p>'+mytext+'</p>';
                textGeneration.trigger('render_report_paragraph', HTML);

                return false;
            };
            button.value = 'Copy to report panel';
            //button = null;

        }

        exportPDF(){

            var element = document.getElementById('text_report_content_new');
            var opt = {
                margin:       1,
                filename:     'myfile.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            // New Promise-based usage:
            html2pdf().set(opt).from(element).save();


            /*
            html2canvas(document.getElementById('text_report_content_new')).then(function (canvas) {
                var img = canvas.toDataURL("image/png");
                var doc = new jsPDF({
                    format: 'a4'
                });
                doc.addImage(img, 'JPEG', 1, 5);
                doc.save('testCanvas.pdf');
            });
             */
        }

        exportPDF_old(){
            let doc = new jsPDF();
            let $report_body = $('#text_report_content_new');
            doc.html(document.getElementById('text_report_content_new'), {
                callback: function (doc) {
                    doc.save('test.pdf');
                },
                x: 10,
                y: 10,
                html2canvas: {
                    scrollX: 0,
                    scrollY: 0,
                    scale: 0.4
                },
            });
        }

    }

    // Expose ModelAnalyticsInterface
    window.V2T.TextGeneration = TextGeneration;
})();