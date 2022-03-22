'use strict'; /* globals V2T */
(function(){
    class TextReport extends V2T.Base {
        constructor(){
            super();
            this.globalV2TData;
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

            // Reverse the sentences, because they are added after the cursor.
            let generated_sentences = [
                new V2T.Sentence(list_of_words_amount_keys),
                new V2T.Sentence(list_of_words_key_names),
                min_max_sentences
            ].flat().reverse();

            $.each(generated_sentences, (index, sentence) => {
                const sentence_as_html = sentence.convertSentenceToHtml();
                sentence_as_html.insertAfter($('#textCursor'));
            });
            //this.trigger('sentences_generated', generated_sentences);
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
                descriptor_data_top_level_abbreviation.push(elem);
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

    }

    // Expose ModelAnalyticsInterface
    window.V2T.TextReport = TextReport;
})();