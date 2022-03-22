'use strict'; /* globals V2T */
(function () {

    class ScatterPlot extends V2T.Base {
        constructor(data_obj, dom_row, visual_analytics_interface) {
            super();
            this.data_obj = data_obj;
            this.dom_row = dom_row;
            this.visual_analytics_interface = visual_analytics_interface;

        }

        render() {

            //TODO better solution?
            const current_data = this.data_obj;
            const viz_interface = this.visual_analytics_interface;

            const x_variable = this.data_obj.fieldData.scalarNames[0];
            const x_data = this.data_obj.pointData[x_variable];
            const max_x_value = d3.max(x_data.data, d => {
                return d;
            })
            const min_x_value = d3.min(x_data.data, d => {
                return d;
            })

            const y_variable = this.data_obj.fieldData.scalarNames[1];
            const y_data = this.data_obj.pointData[y_variable];
            const max_y_value = d3.max(y_data.data, d => {
                return d;
            })
            const min_y_value = d3.min(y_data.data, d => {
                return d;
            })

            const name_variable = this.data_obj.fieldData.pointAxis[1];

            let d3_data = this.data_obj.get3DDataFormattedForD3(x_variable, y_variable, name_variable);

            //add dummy cluster value to the data, this data is used for the coloring
            $.each(d3_data, (index, element) => {
                element.push(0)
            });

            //Define point radius beforehand such that the points do not overflow the canvas
            let point_radius = 4;

            // set the dimensions and margins of the graph
            let margin = {top: 20, right: 20, bottom: 80, left: 50},
                width = 800,
                d3_width = width - margin.left - margin.right,
                height = 400,
                d3_height = height - margin.top - margin.bottom;

            let viewbox_param = "0 0 " + width + " " + height;

            let x = d3.scaleLinear()
                .domain([min_x_value, max_x_value])
                .range([0, d3_width]);

            let y = d3.scaleLinear()
                .domain([min_y_value, max_y_value])
                .range([d3_height, 0]);

            let svg_root = d3.select('#' + this.dom_row)
                .append("svg")
                // .on("click", handleMouseClick)
                .attr("id", "scatterplot" + viz_interface.current_row_id)
                .attr('class', 'svg_root')
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", viewbox_param)
                // Data which is later used by the kmeans reponse
                .property("dataset_v2t", this.data_obj)
                .property("variables", {"x": x_variable, "y": y_variable})
                .property("x_scale", {'domain': [min_x_value, max_x_value], 'range':[0, d3_width]})
                .property("y_scale", {'domain': [min_y_value, max_y_value], 'range':[d3_height, 0]})
                .property("d3_data", d3_data)
                .classed("svg-content", true);

            // set up svg as w3 svg for circular menu
            svg_root.node().setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
            svg_root.node().setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

            let svg = svg_root.append("g")
                .attr("transform",
                    ("translate(" + margin.left + "," + margin.top + ")"))
                .attr("id","main_g");


            svg.append("g")
                .attr("transform", "translate(0," + d3_height + ")")
                .call(d3.axisBottom(x));

            svg.append("text")
                .attr("transform",
                    "translate(" + (d3_width / 2) + " ," +
                    (d3_height + margin.top + 20) + ")")
                .style("text-anchor", "middle")
                .text(x_data.label);


            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (d3_height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text(y_data.label);

            svg.append("g")
                .call(d3.axisLeft(y));

            // Color scale
            let color_scale = d3.scaleOrdinal(d3.schemeCategory10);

            let brush = d3.brush()
                .extent([[0, 0], [d3_width, d3_height]])
                .on("brush", highlightBrushedCircles)
                .on("end", brushEnd);

            svg.append('g')
                .call(brush);


            let start_coords_box = undefined;
            let end_coords_box = undefined;

            function highlightBrushedCircles() {

                //Work around to get the actual coordinates of the box
                if (start_coords_box === undefined) {
                    start_coords_box = {'x': d3.event.sourceEvent.clientX, 'y': d3.event.sourceEvent.clientY}
                }
                if (d3.event.selection != null) {
                    // revert circles to initial style
                    circles
                        .attr('stroke', '#000000')
                        .attr('stroke-width', '1')
                        .attr("class", "non_brushed");
                    let brush_coords = d3.brushSelection(this);
                    // style brushed circles
                    circles.filter(function () {
                        let cx = d3.select(this).attr("cx"),
                            cy = d3.select(this).attr("cy");
                        return isBrushed(brush_coords, cx, cy);
                    })
                        .attr('stroke', '#ff3600')
                        .attr('stroke-width', '1.5')
                        .attr("class", "brushed");
                }
            }

            function isBrushed(brush_coords, cx, cy) {
                let x0 = brush_coords[0][0],
                    x1 = brush_coords[1][0],
                    y0 = brush_coords[0][1],
                    y1 = brush_coords[1][1];
                return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
            }

            function brushEnd() {
                // disregard brushes w/o selections
                // ref: http://bl.ocks.org/mbostock/6232537
                if (!d3.event.selection) return;
                end_coords_box = {'x': d3.event.sourceEvent.clientX, 'y': d3.event.sourceEvent.clientY};

                // programmed clearing of brush after mouse-up
                // ref: https://github.com/d3/d3-brush/issues/10
                d3.select(this).call(brush.move, null);

                let d_brushed = svg.selectAll(".brushed").data();
                // populate table if one or more elements is brushed
                if (d_brushed.length > 0) {
                    let indices = d_brushed.map((element, index) => element[0]);
                    let sub_set = current_data.getSubSetByIdList(indices);
                    brush_end_circular(d3.event, sub_set);
                    viz_interface.trigger("new_selection_for_time_var", sub_set);
                }
            }

            let tool_tip = d3.tip()
                .attr("class", "d3-tip")
                .offset([-8, 0])
                .html(function (d) {
                    const html_code = $(`<div><div class="">${name_variable} : ${d[3]}</div>
                                              <div class="">${x_variable} : ${d[1]}</div>
                                              <div class="">${y_variable} : ${d[2]}</div>
                                              </div>`);
                    return html_code.html();
                });
            svg.call(tool_tip);


            let circles = svg.append('g')
                .selectAll("circle")
                .data(d3_data)
                .enter()
                .append("circle")
                .attr("cx", function (d) {
                    return x(d[1]);
                })
                .attr("cy", function (d) {
                    return y(d[2]);
                })
                .attr("r", point_radius)
                .style("fill", function (d) {
                    return color_scale(d[4])
                })
                // .attr("class", "non_brushed")
                .attr("stroke", "#000000")
                .attr("class", "non_brushed")
                .on('mouseover', tool_tip.show)
                .on('mouseout', tool_tip.hide);

            // Circular Menu Code Start
            const svg_w3 = $('#scatterplot' + this.visual_analytics_interface.current_row_id);
            const pointLocator = svg_w3[0].createSVGPoint();
            let circular_menu_scatter_plot = undefined;

            function brush_end_circular(e, subset_data) {
                let sourceEvent = e.sourceEvent;
                let x0 = sourceEvent.clientX;
                let y0 = sourceEvent.clientY;
                pointLocator.x = x0;
                pointLocator.y = y0;
                const coords = pointLocator.matrixTransform(svg_w3[0].getScreenCTM().inverse());

                // Getting coordinates of the box in svg space
                pointLocator.x = start_coords_box.x;
                pointLocator.y = start_coords_box.y;
                let start_coords_svg = pointLocator.matrixTransform(svg_w3[0].getScreenCTM().inverse());

                pointLocator.x = end_coords_box.x;
                pointLocator.y = end_coords_box.y;
                let end_coords_svg = pointLocator.matrixTransform(svg_w3[0].getScreenCTM().inverse());

                let x_offset = (end_coords_svg.x - start_coords_svg.x) / 2;
                let y_offset = (end_coords_svg.y - start_coords_svg.y) / 2;

                coords.x -= x_offset;
                coords.y -= y_offset;

                if (circular_menu_scatter_plot === undefined) {

                    let data_menu = [
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\solid\\pencil-alt.svg",
                            fill: "#3e8bd7",
                            hover: "#4aa6ff",
                            action: () => {
                                viz_interface.trigger('brush_to_text', subset_data);
                                circular_menu_scatter_plot.hideMenu();
                                circular_menu_scatter_plot = undefined;
                            }
                        },
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\regular\\chart-scatter.svg",
                            fill: "#3e8bd7",
                            hover: "#4aa6ff",
                            action: () => {
                                viz_interface.trigger('brush_to_viz', subset_data);
                                circular_menu_scatter_plot.hideMenu();
                                circular_menu_scatter_plot = undefined;
                            }
                        },
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\regular\\times-circle.svg",
                            fill: "#d70005",
                            hover: "#ff0005",
                            action: () => {
                                circular_menu_scatter_plot.hideMenu();
                                circular_menu_scatter_plot = undefined;
                            }
                        },
                        {
                            icon: "static\\backend\\fontawesome\\svgs\\regular\\clock.svg",
                            fill: "#3e8bd7",
                            hover: "#4aa6ff",
                            action: () => {
                                viz_interface.trigger("open_time_modal");
                                circular_menu_scatter_plot.hideMenu();
                                circular_menu_scatter_plot = undefined;
                            }
                        }
                    ];

                    circular_menu_scatter_plot = new V2T.CircularMenu(coords, menu_holder_id, data_menu);
                    circular_menu_scatter_plot.showMenu();
                } else {
                    circular_menu_scatter_plot.translateMenu(coords);
                }

                //reset the start and end coords to undefined
                start_coords_box = undefined;
                end_coords_box = undefined;
            }

            //As last to ensure top position
            const menu_holder_id = "menu-holder_" + this.visual_analytics_interface.current_row_id;
            svg.append("g")
                .attr('id', menu_holder_id)
                .attr("transform",
                    "translate(250,150)");



        }

    }


// Expose ScatterPlot
    window.V2T.ScatterPlot = ScatterPlot;

})();
