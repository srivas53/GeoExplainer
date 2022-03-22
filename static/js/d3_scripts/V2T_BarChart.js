'use strict'; /* globals V2T */
(function () {

    class BarChart extends V2T.Base {
        constructor(data_obj, dom_row, visual_analytics_interface) {
            super();
            this.data_obj = data_obj;
            this.dom_row = dom_row;
            this.visual_analytics_interface = visual_analytics_interface;

        }

        render() {

            // TODO Jonas how to get this access inside the d3 context, since there this is overridden
            // const current_row_id = this.visual_analytics_interface.current_row_id;
            const viz_interface = this.visual_analytics_interface;
            const current_data = this.data_obj;

            // set the dimensions and margins of the graph
            let margin = {top: 20, right: 20, bottom: 90, left: 60};

            let width = 800,
                d3_width = width - margin.left - margin.right,
                height = 400,
                d3_height = height - margin.top - margin.bottom;


            let viewbox_param = "0 0 " + width + " " + height;

            // set the ranges
            let x = d3.scaleBand()
                .range([0, d3_width])
                .padding(0.1);

            let y = d3.scaleLinear()
                .range([d3_height, 0]);

            let svg_root = d3.select('#' + this.dom_row)
                .append("svg")
                .attr("id", "barchart" + viz_interface.current_row_id)
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", viewbox_param)
                .classed("svg-content", true);

            // set up svg as w3 svg for circular menu
            svg_root.node().setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
            svg_root.node().setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");


            let svg = svg_root.append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");


            // Whenever a barchart is rendered there should be only on variable inside the data obj
            const y_variable = this.data_obj.fieldData.scalarNames[0];
            //TODO @Jonas how to deal with this, i need to know which data i should use
            const x_variable = this.data_obj.fieldData.pointAxis[1];
            const color_variable = this.data_obj.fieldData.pointAxis[0];
            const uid_variable = "UID";
            const y_data = this.data_obj.pointData[y_variable];
            const max_y_value = d3.max(y_data.data, d => {
                return d;
            });
            const x_data = this.data_obj.pointData[x_variable];
            const uid_data = this.data_obj.pointData[uid_variable];

            const color_data = this.data_obj.pointData[color_variable];
            const set_color_data = [...new Set(color_data.data)];

            x.domain(uid_data.data);
            y.domain([0, max_y_value]);


            const myColor = d3.scaleOrdinal()
                .domain(set_color_data)
                .range(d3.schemeCategory10);

            // component wise tuples, since d3 need it this way
            let d3_data = this.data_obj.get4DDataFormattedForD3(x_variable, y_variable, color_variable, uid_variable);

            let tool_tip = d3.tip()
                .attr("class", "d3-tip")
                .offset([-8, 0])
                .html(function (d, i) {
                    const html_code = $(`<div><div class="">${color_variable} : ${d[3]}</div>
                                              <div class="">${x_variable} : ${d[1]}</div>
                                              <div class="">${y_variable} : ${d[2]}</div>
                                              </div>`);
                    return html_code.html();
                });
            svg.call(tool_tip);

            // Circular Menu Code Start
            const svg_w3 = $('#barchart' + viz_interface.current_row_id);
            const pointLocator = svg_w3[0].createSVGPoint();
            let circular_menu_bar_chart = undefined;

            //TODO This is bugged when the user click the background or another chart is spawned
            function mouse_down(e) {
                // Generation of data over the selection

                const highlighted_keys = Object.keys(highlighted_bars);
                const test = highlighted_keys.map((element, index) => +element.split('bar_')[1]);
                const subset_data = current_data.getSubSetByIdList(test);

                //let indices = d_brushed.map((element, index) => element[0]);
                //let sub_set = current_data.getSubSetByIdList(indices);


                let x0 = e.clientX;
                let y0 = e.clientY;
                pointLocator.x = x0;
                pointLocator.y = y0;

                const coords = pointLocator.matrixTransform(svg_w3[0].getScreenCTM().inverse());

                if (circular_menu_bar_chart === undefined) {

                    let data_menu = [
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\solid\\pencil-alt.svg",
                            fill: "#3e8bd7",
                            hover: "#4aa6ff",
                            action: () => {
                                viz_interface.trigger('bar_selection_to_text', subset_data);
                                circular_menu_bar_chart.hideMenu();
                                circular_menu_bar_chart = undefined;
                            }
                        },
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\regular\\chart-bar.svg",
                            fill: "#3e8bd7",
                            hover: "#4aa6ff",
                            action: () => {
                                viz_interface.trigger('bar_selection_to_viz', subset_data);
                                circular_menu_bar_chart.hideMenu();
                                circular_menu_bar_chart = undefined;
                            }
                        },
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\regular\\times-circle.svg",
                            fill: "#d70005",
                            hover: "#ff0005",
                            action: () => {
                                circular_menu_bar_chart.hideMenu();
                                circular_menu_bar_chart = undefined;
                            }
                        },
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\regular\\clock.svg",
                            fill: "#3e8bd7",
                            hover: "#4aa6ff",
                            action: () => {
                                viz_interface.trigger("new_selection_for_time_var", subset_data);
                                viz_interface.trigger("open_time_modal");
                                circular_menu_bar_chart.hideMenu();
                                circular_menu_bar_chart = undefined;
                            }
                        },

                    ];

                    circular_menu_bar_chart = new V2T.CircularMenu(coords, menu_holder_id, data_menu);
                    circular_menu_bar_chart.showMenu();
                } else {
                    circular_menu_bar_chart.translateMenu(coords);
                }
            }

            let highlighted_bars = {};
            let last_bar = undefined;

            function barClickHandler(e, i) {
                const stroke_width = '2';
                const current_bar = d3.select(this);

                if (d3.event.shiftKey) {
                    //same case as normal click
                    if (last_bar === undefined) {
                        highlighted_bars = {};
                        highlighted_bars[current_bar.attr('id')] = current_bar.attr('fill');
                        current_bar.attr('stroke-width',stroke_width);
                    }
                    // all bars between last and current bar are selected
                    else {
                        // Deselect all the old bars
                        $.each(highlighted_bars, (key, element) => {
                            // d3.select('#' + key).attr('fill', element);
                            d3.select('#' + key).attr('stroke-width', '0');
                        });

                        // Select the bars in the range
                        const c_num_current = +current_bar.attr('consecutive_number');
                        const smaller_element = (+last_bar < +c_num_current) ? +last_bar : +c_num_current;
                        const difference = Math.abs(last_bar - c_num_current);
                        for (let i = smaller_element; i <= (smaller_element + difference); i++) {
                            const current_element = d3.select("[consecutive_number='" + i + "']");
                            highlighted_bars[current_element.attr('id')] = current_element.attr('fill');
                            // current_element.attr('fill', 'blue');
                            current_element.attr('stroke-width', stroke_width);
                        }
                    }
                } else if (d3.event.ctrlKey) {

                    let bar_already_selected = highlighted_bars.hasOwnProperty(current_bar.attr('id'));

                    if (bar_already_selected) {
                        current_bar.attr('fill', highlighted_bars[current_bar.attr('id')])
                        delete highlighted_bars[current_bar.attr('id')]
                        current_bar.attr('stroke-width', '0')
                        //TODO what should we do if last bar is removed, windows dont update last bar either
                        // if (last_bar === +current_bar.attr('consecutive_number')){}

                    } else {
                        highlighted_bars[current_bar.attr('id')] = current_bar.attr('fill');
                        // current_bar.attr('fill', "blue");
                        current_bar.attr('stroke-width', stroke_width)
                        last_bar = +current_bar.attr('consecutive_number');
                    }

                    // Normal click event
                } else {

                    // If the same bar is clicked again deselect it
                    let is_same_bar = highlighted_bars.hasOwnProperty(current_bar.attr('id'));

                    // color all bars in original color
                    $.each(highlighted_bars, (key, element) => {
                        // d3.select('#' + key).attr('fill', element);
                        d3.select('#' + key).attr('stroke-width', '0')
                    });

                    highlighted_bars = {};

                    //TODO clarify what happen if a region was selected and then one bar of the region is selected

                    // only if the click was a different bar as the selected color a bar
                    if (!is_same_bar) {
                        highlighted_bars[current_bar.attr('id')] = current_bar.attr('fill');
                        current_bar.attr('stroke-width', stroke_width)
                        last_bar = +current_bar.attr('consecutive_number');
                    } else {
                        last_bar = undefined;
                    }
                }
            }

            svg.selectAll(".V2TDataSet")
                .data(d3_data)
                .enter().append("rect")
                .attr("id", function (d) {
                    return "barchart_" + viz_interface.current_row_id + "_bar_" + d[0];
                })
                .attr("class", "bar")
                .attr('consecutive_number', function (d, i) {
                    return i;
                })
                .attr("x", function (d) {
                    return x(d[4]);
                })
                .attr("width", x.bandwidth())
                .attr("y", function (d) {
                    return y(d[2]);
                })
                .attr("height", function (d) {
                    return d3_height - y(d[2]);
                })
                .attr("fill", function (d) {
                    return myColor(d[3])
                })
                .attr('stroke', '#000000')
                .attr('stroke-width', '0')
                .on('mouseover', tool_tip.show)
                .on('mouseout', tool_tip.hide)
                .on('click', barClickHandler);


            const x_axis = d3.axisBottom(x)
                .tickValues(uid_data.data)
                .tickFormat(function (d, i) {
                    return d3_data[i][1]
                });


            svg.append("g")
                .attr("transform", "translate(0," + d3_height + ")")
                .call(x_axis)
                .selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(65)")
                .style("text-anchor", "start");

            svg.append("g")
                .call(d3.axisLeft(y));

            svg.append("text")
                .attr("transform",
                    "translate(" + (d3_width / 2) + " ," +
                    (d3_height + margin.top + margin.bottom - 25) + ")")
                .style("text-anchor", "middle")
                .text(x_variable.split('_').join(' '));

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (d3_height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text(y_data.label);

            console.log("LABEL", y_data.label);

            // Add a Legend
            let legend_keys = new Set();
            $.each(d3_data, (index, element) => {
                legend_keys.add(element[3])
            });
            legend_keys =[... (legend_keys)];

            svg.selectAll("mylabels")
                .data(legend_keys)
                .enter()
                .append("text")
                .attr("x", 50)
                .attr("y", function (d, i) {
                    return 18 + i * 25
                }) // 100 is where the first dot appears. 25 is the distance between dots
                .style("fill", function (d, i) {
                    return myColor(d)
                })
                .text(function (d, i) {
                    return d + ", " + window.states_to_abbreviation[d];
                })
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle")

            svg.selectAll("mydots")
                .data(legend_keys)
                .enter()
                .append("rect")
                .attr("x", 25)
                .attr("width",14)
                .attr("height", 14)
                .attr("y", function (d, i) {
                    return 10 + i * 25
                }) // 100 is where the first dot appears. 25 is the distance between dots
                .style("fill", function (d, i) {
                    return myColor(d)
                })



            //As last to ensure top position
            // TODO make menu holder dependent on current row, such that is unique
            const menu_holder_id = "menu-holder_" + viz_interface.current_row_id;
            svg.append("g")
                .attr('id', menu_holder_id)
                .attr("transform",
                    "translate(250,150)");

            //TODO Change to file manager style
            // svg_w3.on('contextmenu', mouse_down);
            svg_w3.on("contextmenu", function (event) {
                event.preventDefault();
                mouse_down(event);
            });


            const current_delete_btn = "#btn_" + viz_interface.current_row_id + "_delete";
            $(current_delete_btn).click((e) => {
                const parent_node = $(e.target)[0].parentNode;
                parent_node.remove();
            });

            const current_screenshot_btn = "#btn_" + viz_interface.current_row_id + "_screenshot";
            $(current_screenshot_btn).click((e) => {
                this.visual_analytics_interface.createImageOfSVG(svg_root, 2400, 1200);
            });

            const current_swap_btn = "#btn_" + this.visual_analytics_interface.current_row_id + "_swap";
            $(current_swap_btn).click((e) => {
                // get chart from the top row and add it to a new row element
                const current_top_chart = $('#plot_content');
                const content_of_top_row = current_top_chart.children();
                const new_row = this.visual_analytics_interface.createAndAppendNewBSRow();
                $('#' + new_row).append(content_of_top_row);

                // get clicked chart and put it on the top
                const clicked_chart = $($(e.target)[0].parentNode).find('.svg-container');
                current_top_chart.append(clicked_chart);
                $(e.target)[0].parentNode.remove();
            });
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

    }


// Expose BarChart
    window.V2T.BarChart = BarChart;

})();
