'use strict'; /* globals V2T */
(function () {

    class CurveChart extends V2T.Base {
        constructor(data_obj, time_variable, data_index, dom_row, persistence, visual_analytics_interface) {
            super();
            this.data_obj = data_obj;
            this.time_variable = time_variable;
            this.data_index = data_index;
            this.dom_row = dom_row;
            this.persistence = persistence;
            this.visual_analytics_interface = visual_analytics_interface;

        }

        render() {

            //TODO Change
            const hardcode_county_index = this.data_index;
            const x_label_chart = "Time (Days)";

            const data_array = this.data_obj.pointData[this.time_variable];

            const time_array = data_array.time.map(function (d) {
                return new Date(d);
            });

            const point_type_array = new Array(data_array.nComponents).fill(0);
            $.each(this.persistence, (index_triplet, element_triplet) => {
                let index_maxima = element_triplet[0];
                let index_saddle = element_triplet[1];

                point_type_array[index_maxima] = 1;
                point_type_array[index_saddle] = -1;
            });

            const dot_colors = ["#404040", "#ca0020", "#0051ca"];

            // set the dimensions and margins of the graph
            let margin = {top: 20, right: 20, bottom: 80, left: 70},
                width = 800,
                d3_width = width - margin.left - margin.right,
                height = 400,
                d3_height = height - margin.top - margin.bottom;

            let viewbox_param = "0 0 " + width + " " + height;

            let x_data = time_array
            let y_data = data_array.data[hardcode_county_index];

            let amount_points = data_array.nComponents;
            //TODO refactor to Methode
            let d3_data = x_data.map((e, i) => [i, e, y_data[i], point_type_array[i]])

            let xScale = d3.scaleTime()
                .range([0, d3_width]);

            let yScale = d3.scaleLinear()
                .range([d3_height, 0]);

            xScale.domain(d3.extent(x_data, function (d) {
                return d;
            }));

            yScale.domain(d3.extent(y_data, function (d) {
                return d;
            }));

            let line = d3.line()
                .x(function (d, i) {
                    return xScale(d[1]);
                })
                .y(function (d, i) {
                    return yScale(d[2]);
                })
                .curve(d3.curveMonotoneX)

            // define the area
            let area = d3.area()
                .x(function (d, i) {
                    return xScale(d[1]);
                })
                .y0(d3_height)
                .y1(function (d, i) {
                    return yScale(d[2]);
                })
                .curve(d3.curveMonotoneX)


            let svg_root = d3.select('#' + this.dom_row)
                .append("svg")
                .attr("id", "curvechart" + this.current_row_id)
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", viewbox_param)
                .classed("svg-content", true);

            let svg = svg_root.append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + d3_height + ")")
                .call(d3.axisBottom(xScale));

            svg.append("g")
                .attr("class", "y axis")
                .call(d3.axisLeft(yScale));

            // add the area
            svg.append("path")
                .datum(d3_data)
                .attr("fill", "#bababa")
                .attr("d", area);

            svg.append("path")
                .datum(d3_data)
                //.attr("class", "curve_line")
                .attr('fill', 'none')
                .attr('stroke', "black")
                .attr('stroke-width', 1.5)
                .attr("d", line);

            svg.selectAll(".dot")
                .data(d3_data)
                .enter().append("circle") // Uses the enter().append() method
                // .attr('stroke', '#fff')
                // .attr('stroke-width', 1)
                .attr("fill", function (d) {
                    if (d[3] === 1) return dot_colors[1];
                    if (d[3] === 0) return dot_colors[0];
                    if (d[3] === -1) return dot_colors[2];
                })
                .attr("cx", function (d, i) {
                    return xScale(d[1])
                })
                .attr("cy", function (d) {
                    return yScale(d[2])
                })
                .attr("r", function (d) {
                    if (d[3] === 1) return 4;
                    if (d[3] === 0) return 2;
                    if (d[3] === -1) return 4;
                });

            svg.append("text")
                .attr("transform",
                    "translate(" + (d3_width / 2) + " ," +
                    (d3_height + margin.top + 20) + ")")
                .style("text-anchor", "middle")
                .text(x_label_chart);

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (d3_height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text(data_array.label);


            // Add a legend to the plot

            const legend_keys = ['Normal', 'Maxima', "Minima"];

            svg.selectAll("mydots")
                .data(legend_keys)
                .enter()
                .append("circle")
                .attr("cx", 25)
                .attr("cy", function (d, i) {
                    return 10 + i * 25
                }) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 7)
                .style("fill", function (d, i) {
                    return dot_colors[i]
                })

            svg.selectAll("mylabels")
                .data(legend_keys)
                .enter()
                .append("text")
                .attr("x", 45)
                .attr("y", function (d, i) {
                    return 10 + i * 25
                }) // 100 is where the first dot appears. 25 is the distance between dots
                .style("fill", function (d, i) {
                    return dot_colors[i]
                })
                .text(function (d) {
                    return d
                })
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle")


            const current_delete_btn = "#btn_" + this.visual_analytics_interface.current_row_id + "_delete";
            $(current_delete_btn).click((e) => {
                const parent_node = $(e.target)[0].parentNode;
                parent_node.remove();
            });

            const current_screenshot_btn = "#btn_" + this.visual_analytics_interface.current_row_id + "_screenshot";
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

    }


// Expose CurveChart
    window.V2T.CurveChart = CurveChart;

})();
