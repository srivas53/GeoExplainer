'use strict'; /* globals V2T */
(function () {

    // noinspection JSCheckFunctionSignatures
    class LanguageEngine extends V2T.Base {
        constructor() {
            super();
        }

        //TODO rethink what the best way of calling all these functions is
        generateTextFromDataObject(data_obj) {
            this.v2tDataObject = data_obj;

            // Decide which type of text should be generated
            let amount_point_data = Object.keys(this.v2tDataObject.pointData).length;
            let data_dimension = amount_point_data - this.v2tDataObject.fieldData.pointAxis.length;
            let generated_sentences = [];
            if (data_dimension === 1) {
                generated_sentences = this.generateMinMaxAvgText();
            } else if (data_dimension >= 2) {
                generated_sentences = this.generateMinMaxAvgText();
                generated_sentences.push(this.generateCorrelationText());
            }
            this.trigger('sentences_generated', generated_sentences);
        }

        descriptorNameToAbbreviation(string_name) {
            if (window.use_usa_state_abbreviations) {
                //USA based data set
                return window.states_to_abbreviation[string_name];
            } else {
                //add other cases
                return string_name;
            }
        }

        generateGlobalSummary(data_obj) {
            this.v2tDataObject = data_obj;
            // Get amount of keys
            let keys_point_data = Object.keys(this.v2tDataObject.pointData)
            let keys_actual_data = keys_point_data.filter(n => !this.v2tDataObject.fieldData.pointAxis.includes(n))
            let amount_point_data = keys_point_data.length;
            let amount_keys = amount_point_data - this.v2tDataObject.fieldData.pointAxis.length;

            let list_of_words_amount_keys = [
                "There are ",
                {string: amount_keys, data: undefined},
                " different numerical variables inside the dataset"
            ];

            let list_of_words_key_names = ["Theses are "];

            $.each(keys_actual_data, (index, element) => {
                // First key does not need a comma
                if (index === 0) {
                    list_of_words_key_names.push({string: element, data: undefined})
                    // Last key should have a "And"
                } else if (index === keys_actual_data.length - 1) {
                    list_of_words_key_names.push(", and ")
                    list_of_words_key_names.push({string: element, data: undefined})
                    // All others have a trailing comma
                } else {
                    list_of_words_key_names.push(", ")
                    list_of_words_key_names.push({string: element, data: undefined})
                }
            });

            if (keys_actual_data.length === 1) {
                list_of_words_key_names = ["This variable is ", {string: keys_actual_data[0], data: undefined}]
            }

            // get min max sentences for all the variables
            const min_max_sentences = this.generateMinMaxAvgText();

            console.log(min_max_sentences);

            // Reverse the sentences, because they are added after the cursor.
            let generated_sentences = [
                new V2T.Sentence(list_of_words_amount_keys),
                new V2T.Sentence(list_of_words_key_names),
                min_max_sentences
            ].flat().reverse()

            this.trigger('sentences_generated', generated_sentences);
        }

        generateMinMaxAvgText() {

            // String which stores the resulting text
            let result_min = [];
            let result_max = [];
            let result_avg = [];

            const keys = this.v2tDataObject.fieldData.scalarNames;

            //TODO Jonas, how should i know, that I need here the counties not the states?
            const descriptor_array = this.v2tDataObject.pointData[this.v2tDataObject.fieldData.pointAxis[1]];
            const descriptor_data = descriptor_array.data;

            const descriptor_array_top_level = this.v2tDataObject.pointData[this.v2tDataObject.fieldData.pointAxis[0]];
            const descriptor_data_top_level = descriptor_array_top_level.data;

            let descriptor_data_top_level_abbreviation = []
            $.each(descriptor_data_top_level, (index, elem) => {
                descriptor_data_top_level_abbreviation.push(this.descriptorNameToAbbreviation(elem));
            });


            let min_pos_of_key = {};
            let max_pos_of_key = {};

            // Basic calculation of the minimum and maximum element of each key
            $.each(keys, (index, key) => {
                let current_scalar_array = this.v2tDataObject.pointData[key].data;
                let min_pos = 0;
                let max_pos = 0;

                $.each(current_scalar_array, (index_s, value_s) => {
                    min_pos = +current_scalar_array[min_pos] > +value_s ? index_s : min_pos;
                    max_pos = +current_scalar_array[max_pos] < +value_s ? index_s : max_pos;
                });

                let minima = [];
                let maxima = [];

                // Advanced calculation which detects multiple minima/maxima
                $.each(current_scalar_array, (index_s, value_s) => {
                    if (current_scalar_array[min_pos] === value_s) {
                        minima.push(index_s);
                    }
                    if (current_scalar_array[max_pos] === value_s) {
                        maxima.push(index_s);
                    }
                });

                min_pos_of_key[key] = minima;
                max_pos_of_key[key] = maxima;

                //calculate the avg
                let sum = 0;
                $.each(current_scalar_array, (index_s, value_s) => {
                    sum += +value_s;
                });

                const avg = Math.round(((sum / current_scalar_array.length) + Number.EPSILON) * 100) / 100;

                // Name of the point axis for the text called point label and can be found in the field data
                const point_label = this.v2tDataObject.fieldData.pointLabels[1];

                // The label for the current variable, which the user has defined in the settings menu
                const user_defined_label = this.v2tDataObject.pointData[key].label;

                //Minima
                const amount_minima = minima.length;
                let list_of_words_min = [];
                // Decide which sentence is generated by amount of min/max values
                if (amount_minima === 1) {
                    list_of_words_min = [
                        {
                            string: descriptor_data[minima[0]] + ", " + descriptor_data_top_level_abbreviation[minima[0]],
                            data: undefined
                        },
                        " is the ",
                        {string: point_label[0], data: undefined},
                        " with the lowest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[minima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                } else if (amount_minima === 2) {
                    list_of_words_min = [
                        {
                            string: descriptor_data[minima[0]] + ", " + descriptor_data_top_level_abbreviation[minima[0]],
                            data: undefined
                        },
                        " and ",
                        {
                            string: descriptor_data[minima[1]] + ", " + descriptor_data_top_level_abbreviation[minima[1]],
                            data: undefined
                        },
                        " are the ",
                        {string: point_label[1], data: undefined},
                        " with the lowest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[minima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                } else if (amount_minima === 3) {
                    list_of_words_min = [
                        {
                            string: descriptor_data[minima[0]] + ", " + descriptor_data_top_level_abbreviation[minima[0]],
                            data: undefined
                        },
                        ", ",
                        {
                            string: descriptor_data[minima[1]] + ", " + descriptor_data_top_level_abbreviation[minima[1]],
                            data: undefined
                        },
                        " and ",
                        {
                            string: descriptor_data[minima[2]] + ", " + descriptor_data_top_level_abbreviation[minima[2]],
                            data: undefined
                        },
                        " are the ",
                        {string: point_label[1], data: undefined},
                        " with the lowest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[minima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                } else {
                    list_of_words_min = [
                        {
                            string: descriptor_data[minima[0]] + ", " + descriptor_data_top_level_abbreviation[minima[0]],
                            data: undefined
                        },
                        ", ",
                        {
                            string: descriptor_data[minima[1]] + ", " + descriptor_data_top_level_abbreviation[minima[1]],
                            data: undefined
                        },
                        ", ",
                        {
                            string: descriptor_data[minima[2]] + ", " + descriptor_data_top_level_abbreviation[minima[2]],
                            data: undefined
                        },
                        " and ",
                        {string: amount_minima - 3, data: undefined},
                        " other are the ",
                        {string: point_label[1], data: undefined},
                        " with the lowest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[minima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                }
                result_min.push(new V2T.Sentence(list_of_words_min));

                //Maxima
                const amount_maxima = maxima.length;

                let list_of_words_max = [];
                if (amount_maxima === 1) {
                    list_of_words_max = [
                        {
                            string: descriptor_data[maxima[0]] + ", " + descriptor_data_top_level_abbreviation[maxima[0]],
                            data: undefined
                        },
                        " is the ",
                        {string: point_label[0], data: undefined},
                        " with the highest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[maxima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                } else if (amount_maxima === 2) {
                    list_of_words_max = [
                        {
                            string: descriptor_data[maxima[0]] + ", " + descriptor_data_top_level_abbreviation[maxima[0]],
                            data: undefined
                        },
                        " and ",
                        {
                            string: descriptor_data[maxima[1]] + ", " + descriptor_data_top_level_abbreviation[maxima[1]],
                            data: undefined
                        },
                        " are the ",
                        {string: point_label[1], data: undefined},
                        " with the highest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[maxima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                } else if (amount_maxima === 3) {
                    list_of_words_max = [
                        {
                            string: descriptor_data[maxima[0]] + ", " + descriptor_data_top_level_abbreviation[maxima[0]],
                            data: undefined
                        },
                        ", ",
                        {
                            string: descriptor_data[maxima[1]] + ", " + descriptor_data_top_level_abbreviation[maxima[1]],
                            data: undefined
                        },
                        " and ",
                        {
                            string: descriptor_data[maxima[2]] + ", " + descriptor_data_top_level_abbreviation[maxima[2]],
                            data: undefined
                        },
                        " are the ",
                        {string: point_label[1], data: undefined},
                        " with the highest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[maxima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                } else {
                    list_of_words_max = [
                        {
                            string: descriptor_data[maxima[0]] + ", " + descriptor_data_top_level_abbreviation[maxima[0]],
                            data: undefined
                        },
                        ", ",
                        {
                            string: descriptor_data[maxima[1]] + ", " + descriptor_data_top_level_abbreviation[maxima[1]],
                            data: undefined
                        },
                        ", ",
                        {
                            string: descriptor_data[maxima[2]] + ", " + descriptor_data_top_level_abbreviation[maxima[2]],
                            data: undefined
                        },
                        " and ",
                        {string: amount_maxima - 3, data: undefined},
                        " other are the ",
                        {string: point_label[1], data: undefined},
                        " with the highest ",
                        {string: user_defined_label, data: undefined},
                        " of ",
                        {string: current_scalar_array[maxima[0]], data: undefined},
                        " ",
                        this.v2tDataObject.pointData[key].unit
                    ];
                }
                result_max.push(new V2T.Sentence(list_of_words_max));

                let list_of_words_avg = [
                    "The average value of ",
                    {string: user_defined_label, data: undefined},
                    " over the selection is ",
                    {string: avg, data: undefined},
                    " ",
                    this.v2tDataObject.pointData[key].unit
                ];

                result_avg.push(new V2T.Sentence(list_of_words_avg));

            });
            // Reverse the sentences, because they are added after the cursor.
            return [result_min, result_max, result_avg].flat().reverse()
        }

        generateCorrelationText() {

            const options = {
                'x': this.v2tDataObject.fieldData.scalarNames[0],
                'y': this.v2tDataObject.fieldData.scalarNames[1],
                'x_label': this.v2tDataObject.pointData[this.v2tDataObject.fieldData.scalarNames[0]].label,
                'y_label': this.v2tDataObject.pointData[this.v2tDataObject.fieldData.scalarNames[1]].label
            }

            console.log(this.v2tDataObject);


            //TODO do the correlation calculation in an other method?
            let x_values = [];
            let y_values = [];

            // Calculate the correlation with the following formula:
            for (let i = 0; i < this.v2tDataObject.nPoints; i++) {
                x_values.push(this.v2tDataObject.pointData[options.x].data[i]);
                y_values.push(this.v2tDataObject.pointData[options.y].data[i]);
            }
            // $.each(data, (index, value) => {
            //     x_values.push(value[options.x]);
            //     y_values.push(value[options.y]);
            // });

            const x_sum = x_values.reduce((previous, current) => current += previous);
            const y_sum = y_values.reduce((previous, current) => current += previous);

            const x_mean = x_sum / x_values.length;
            const y_mean = y_sum / y_values.length;

            //TODO at the end: n or n-1?
            const x_std = Math.sqrt(x_values.map(x => Math.pow(x - x_mean, 2)).reduce((a, b) => a + b) / (x_values.length - 1));
            const y_std = Math.sqrt(y_values.map(y => Math.pow(y - y_mean, 2)).reduce((a, b) => a + b) / (y_values.length - 1));


            let x_y_product = 0;
            for (let i = 0; i < x_values.length; i++) {
                x_y_product += (x_values[i] - x_mean) * (y_values[i] - y_mean);
            }

            let correlation = (x_y_product / (x_std * y_std)) / (x_values.length - 1);

            correlation = Math.round((correlation + Number.EPSILON) * 100) / 100

            let classification_word = undefined;

            if (correlation === 1) {
                classification_word = " perfect uphill linear "
            } else if (correlation > 0.7) {
                classification_word = " strong uphill linear "
            } else if (correlation > 0.5) {
                classification_word = " moderate uphill linear "
            } else if (correlation > 0.3) {
                classification_word = " weak uphill linear "
            } else if (correlation > -0.3 && correlation < 0.3) {
                classification_word = " no linear"
            } else if (correlation > -0.5) {
                classification_word = " weak downhill linear "
            } else if (correlation > -0.7) {
                classification_word = " moderate downhill linear "
            } else if (correlation > -1) {
                classification_word = " strong downhill linear "
            } else if (correlation === -1) {
                classification_word = " perfect downhill linear "
            }

            let sentence_parts = ["Between ", {string: options.x_label, data: undefined}, " and ", {
                string: options.y_label,
                data: undefined
            }, " is a" + classification_word + "correlation with the value ", {string: correlation, data: undefined}]

            return new V2T.Sentence(sentence_parts);

        }

        generateCurveDataText(data_set, variable_name, index, persistence_data) {

            const point_data = data_set.globalDataSet.pointData;

            // Data array of the variable
            const point_data_current_variable = point_data[variable_name];
            const point_data_current_variable_at_time_index = point_data_current_variable.data[index];
            const point_data_current_variable_time_array = point_data_current_variable.time;

            // TODO Fix hardcode to county
            // For now, this are the state
            const point_data_axis_high = point_data[data_set.globalDataSet.fieldData.pointAxis[0]]
            // For now, this are the counties
            const point_data_axis_low = point_data[data_set.globalDataSet.fieldData.pointAxis[1]]

            const curve_maxima_indices = persistence_data.map(i => i[0]);
            const curve_saddle_indices = persistence_data.map(i => i[1]);

            const format_options = {timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric'};
            const curve_maxima_dates = curve_maxima_indices.map(i => new Date(point_data_current_variable_time_array[i]).toLocaleString('en-GB', format_options))
            const curve_saddle_dates = curve_saddle_indices.map(i => new Date(point_data_current_variable_time_array[i]).toLocaleString('en-GB', format_options))

            const curve_maxima_values = curve_maxima_indices.map(i => point_data_current_variable_at_time_index[i]);
            const curve_saddle_values = curve_saddle_indices.map(i => point_data_current_variable_at_time_index[i]);

            //TODO sentence about saddle points
            let sentence_parts = [];
            //Case 0 triplet
            if (persistence_data.length === 0) {
                console.log("ERROR: NO Data")
                //Case 1 triplet
            } else if (persistence_data.length === 1) {
                sentence_parts = [
                    {string: point_data_axis_low.data[index], data: undefined},
                    ", ", {string: point_data_axis_high.data[index], data: undefined},
                    " has ", {string: 1, data: undefined},
                    " spike in ", {string: variable_name, data: undefined},
                    " at ", {string: curve_maxima_dates.toString(), data: undefined},
                    " with ", {string: curve_maxima_values.toString(), data: undefined},
                    " ", {string: point_data_current_variable.unit, data: undefined},
                ];
                //Case 2 triplets
            } else if (persistence_data.length === 2) {
                sentence_parts = [
                    {string: point_data_axis_low.data[index], data: undefined},
                    ", ", {string: point_data_axis_high.data[index], data: undefined},
                    " has ", {string: 2, data: undefined},
                    " spikes in ", {string: variable_name, data: undefined},
                    " at ", {string: curve_maxima_dates.toString(), data: undefined},
                    " with ", {string: curve_maxima_values.toString(), data: undefined},
                    " ", {string: point_data_current_variable.unit, data: undefined},
                ];
                //Case more then 2 triplets
            } else {
                sentence_parts = [
                    {string: point_data_axis_low.data[index], data: undefined},
                    ", ", {string: point_data_axis_high.data[index], data: undefined},
                    " has ", {string: persistence_data.length, data: undefined},
                    " spikes in ", {string: variable_name, data: undefined},
                    ". ",
                    "The most important two are at ", {string: curve_maxima_dates[0], data: undefined},
                    " and ", {string: curve_maxima_dates[1], data: undefined},
                    " with ", {string: curve_maxima_values[0], data: undefined},
                    " and ", {string: curve_maxima_values[1], data: undefined},
                    " ", {string: point_data_current_variable.unit, data: undefined},
                ];
            }
            return new V2T.Sentence(sentence_parts);
        }

        kmeansToText(hulls, v2t_dataset, variables) {

            console.log(v2t_dataset);
            console.log(variables);

            const x_data = v2t_dataset.pointData[variables.x]
            const y_data = v2t_dataset.pointData[variables.y]

            // The d3 color is strange therefore we have to store the color code and map it here
            const color_dict = {
                "#bcbd22": "greenish",
                "#2ca02c": "green",
                "#9467bd": "purple",
                "#e377c2": "pink",
                "#7f7f7f": "grey",
                "#8c564b": "brown",
                "#ff7f0e": "orange",
                "#1f77b4": "blue",
                "#17becf": "cyan",
                "#d62728": "red"
            };

            const sentences = [];


            $.each(hulls, (index, element) => {

                if (element.data.count === 1) {
                    sentences.push(
                        new V2T.Sentence([
                            "The ",
                            {string: color_dict[element.color], data: undefined},
                            " cluster contains ",
                            {string: element.data.count, data: undefined},
                            " point",
                        ])
                    );
                } else if (element.data.count === 2) {
                    new V2T.Sentence([
                        "The ",
                        {string: color_dict[element.color], data: undefined},
                        " cluster contains ",
                        {string: element.data.count, data: undefined},
                        " points",
                    ])
                } else {
                    sentences.push(
                        new V2T.Sentence([
                            "The ",
                            {string: color_dict[element.color], data: undefined},
                            " cluster contains ",
                            {string: element.data.count, data: undefined},
                            " points. ",
                            "The values of the ",
                            {string: x_data.label, data: undefined},
                            " (x-axis) range from ",
                            {string: element.data.x_min, data: undefined},
                            " to ",
                            {string: element.data.x_max, data: undefined},
                            " ",
                            {string: x_data.unit, data: undefined},
                            " and the average value is ",
                            {string: element.data.x_avg, data: undefined},
                            " ",
                            {string: x_data.unit, data: undefined},
                            ". ",
                            "The values of the ",
                            {string: y_data.label, data: undefined},
                            " (y-axis) range from ",
                            {string: element.data.y_min, data: undefined},
                            " to ",
                            {string: element.data.y_max, data: undefined},
                            " ",
                            {string: y_data.unit, data: undefined},
                            " and the average value is ",
                            {string: element.data.y_avg, data: undefined},
                            " ",
                            {string: x_data.unit, data: undefined},
                        ])
                    )
                }
            })

            sentences.push(new V2T.Sentence([
                "There were ",
                {string: hulls.length, data: undefined},
                " clusters detected"
            ]));

            return sentences;
        }
    }


// Expose LanguageEngine
    window.V2T.LanguageEngine = LanguageEngine;

})();