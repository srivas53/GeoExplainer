'use strict'; /* globals V2T */
(function () {

    class SvgMap extends V2T.Base {
        constructor(data_obj, dom_row, visual_analytics_interface) {
            super();
            this.data_obj = data_obj;
            this.dom_row = dom_row;
            this.visual_analytics_interface = visual_analytics_interface;
        }

        render() {
            const current_data = this.data_obj;
            let geojson_data = {
                "type": "FeatureCollection"
            }
            geojson_data["features"] = current_data;
            //console.log(geojson_data);
            const viz_interface = this.visual_analytics_interface;
            //const geojson_data = this.data_obj;
            // set the dimensions and margins of the graph
            let margin = {top: 20, right: 20, bottom: 80, left: 50},
                width = 800,
                d3_width = width - margin.left - margin.right,
                height = 400,
                d3_height = height - margin.top - margin.bottom;

            let viewbox_param = "0 0 " + width + " " + height;

            let svg_root = d3.select('#' + this.dom_row)
                .append("svg")
                .attr("id", "svgmap" + viz_interface.current_row_id)
                .attr('class', 'svg_root')
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", viewbox_param)
                .classed("svg-content", true);

            // Map and projection
            let projection = d3.geoAlbersUsa()
                .scale(900)
                .translate([width / 2, height / 2]);

            let path = d3.geoPath().projection(projection);

            var zoom = d3.zoom()
                .scaleExtent([1, 8])
                .translateExtent([[0, 0], [width, height]])
                .extent([[0, 0], [width, height]])
                .on("zoom", zoomed);

            let colorScale = d3.scaleThreshold()
                .domain([2.03, 3.16, 8.46, 12.61, 20.00, 50.37])
                .range(d3.schemeReds[7]);

            svg_root.call(zoom);

            const g = svg_root.append("g");
            g.selectAll("path")
                .data(geojson_data.features)
                .enter()
                .append("path")
                // draw each country
                .attr("d", path)
                .style("stroke", "#d9d9d9")
                .style("stroke-width", "0.5")
                .attr("class", function (d) {
                    return "Country"
                })
                // set the color of each country
                .attr("fill", function (d) {
                    //console.log(d.properties.confirmed_per10k);
                    return colorScale(d.properties.confirmed_per10k);
                })
                .call(autoZooming);


            function zoomed() {
                g.attr("transform", d3.event.transform);
            }

            // Map auto zooming
            function autoZooming() {
                let bounds = path.bounds(geojson_data),
                    dx = bounds[1][0] - bounds[0][0],
                    dy = bounds[1][1] - bounds[0][1],
                    x = (bounds[0][0] + bounds[1][0]) / 2,
                    y = (bounds[0][1] + bounds[1][1]) / 2,
                    scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
                    translate = [width / 2 - scale * x, height / 2 - scale * y];
                svg_root.transition()
                    .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));

            }


            function brushed() {
                let value = [];
                if (d3.event.selection) {
                    const [[x0, y0], [x1, y1]] = d3.event.selection;
                    svg_root.filter(function () {
                        d3.select(this).attr("class", function (d) {
                            return "Country_selected"
                        });
                    });

                }
                let d_brushed = svg_root.selectAll(".Country_selected").data();
                console.log(d_brushed);
            }

            //As last to ensure top position
            const menu_holder_id = "menu-holder_" + this.visual_analytics_interface.current_row_id;
            g.append("g")
                .attr('id', menu_holder_id)
                .attr("transform",
                    "translate(250,150)");

        }
    }

// Expose SvgMap
    window.V2T.SvgMap = SvgMap;

})();