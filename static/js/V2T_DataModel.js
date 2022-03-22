'use strict'; /* globals V2T */
(function () {

    class V2TGlobalData extends V2T.Base {
        constructor(data, properties){
            /*  
            @param data: original json => dictionary based data set
            @param properties: properties that are used in this system
            */
            super();
            //global data in dictionary, pls use this global flexibly
            this.globalDataSetRaw = data;
            //global data model based on V2TArray obj
            this.globalDataSet = this.generateGlobalDataSet(properties);
            // init 5 or 6 stops
            // this part of parameters are flexible to add or remove based on what you need at your part.
            this.mapData_scales = {};
            for(let i = 0; i < properties.length; i++){
                this.mapData_scales[properties[i]] = [];
            }

            this.mapCircle_scales = {};
            for(let i = 0; i < properties.length; i++){
                this.mapCircle_scales[properties[i]] = [];
            }
            // max,min,first_quart,second_quart,avg,mid,stdDev
            this.data_statistics = {}; //VS Add: Might have to remove

            
        }

        //generate global data model
        generateGlobalDataSet(properties){
            
            //seems only used at fieldData?
            let point_axis = ["state_name", "county_name", "UID"];

            // set keys of data point
            let point_data_keys = ["state_name", "county_name", "UID"];
            // seems only used at fieldData?
            let point_labels = [["state","states"],["county", "counties"]];

            // set keys of data point
            for(let i = 0; i < properties.length; i++){
                point_data_keys.push(properties[i]);
            }

            let data = this.globalDataSetRaw.features;

            let data_set = new V2T.V2TDataSet(point_data_keys, point_axis, point_labels, data);
            //console.log(data_set);

            return data_set;

        }

        // @numbers one-dim array
        // @digit accuracy of float to .00
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
            let unique_sequence = [];
            //remove duplicates
            for(let i = 0;i<sequence.length;i++){
                if(unique_sequence.indexOf(sequence[i])<0){
                    unique_sequence.push(sequence[i]);
                }
            }
            let unique_len = unique_sequence.length;
            let mid = (unique_len % 2 === 0) ? (unique_sequence[unique_len/2] + unique_sequence[unique_len/2+1]) / 2 : unique_sequence[(unique_len+1)/2];
            
            //get quartiles
            let first_quart = (0 + mid) / 2;
            
            let second_quart = (max + mid) / 2;
        
            // standard deviation
            let stdDev = Math.sqrt(numbers.map(n=> (n-avg) * (n-avg)).reduce(sum) / len);
            stdDev = parseFloat(stdDev.toFixed(digit));
            mid = parseFloat(mid.toFixed(digit));
            second_quart = parseFloat(second_quart.toFixed(digit));
            first_quart = parseFloat(first_quart.toFixed(digit));
            avg = parseFloat(avg.toFixed(digit));
            
            return {
                max,
                min,
                first_quart,
                second_quart,
                avg,
                mid,
                stdDev
            }
        }

        getMapDataScales(properties){
            let pre_cal_dict = {}
            for(let i = 0; i < properties.length; i++){
                pre_cal_dict[properties[i]] = [];
            }
            //get arrays of each properties
            for(let i = 0; i < this.globalDataSetRaw["features"].length; i++){
                for(let j = 0; j < properties.length; j++){
                    pre_cal_dict[properties[j]].push(this.globalDataSetRaw["features"][i]["properties"][properties[j]]);
                }
            }
            // calculate max, min and so on
            for(let i = 0; i < properties.length; i++){
                let calResults = this.doCalculation(pre_cal_dict[properties[i]]);
                this.data_statistics[properties[i]] = calResults;
                if(calResults["min"] === 0){
                    this.mapData_scales[properties[i]] = [
                        [calResults["min"],'#edf8e9'],
                        [calResults["first_quart"],'#bae4b3'],
                        [calResults["mid"],'#74c476'],
                        [calResults["second_quart"],'#31a354'],
                        [calResults["max"],'#006d2c']
                        /*
                        * [calResults["min"],'#c7e9c0'],
                        [calResults["first_quart"],'#d9ef8b'],
                        [calResults["mid"],'#91cf60'],
                        [calResults["second_quart"],'#74c476'],
                        [calResults["max"],'#1a9850']
                        * */
                    ];
                }else{
                    this.mapData_scales[properties[i]] = [
                        [calResults["min"],'#edf8e9'],
                        [calResults["first_quart"],'#bae4b3'],
                        [calResults["mid"],'#74c476'],
                        [calResults["second_quart"],'#31a354'],
                        [calResults["max"],'#006d2c']
                    ];
                }
            }
        }

        getMapCircleScales(properties){
            let pre_cal_dict = {}
            for(let i = 0; i < properties.length; i++){
                pre_cal_dict[properties[i]] = [];
            }
            //get arrays of each properties
            for(let i = 0; i < this.globalDataSetRaw["features"].length; i++){
                for(let j = 0; j < properties.length; j++){
                    pre_cal_dict[properties[j]].push(this.globalDataSetRaw["features"][i]["properties"][properties[j]]);
                }
            }
            // calculate max, min and so on
            for(let i = 0; i < properties.length; i++){
                let calResults = this.doCalculation(pre_cal_dict[properties[i]]);
                if(calResults["min"] === 0){
                    this.mapCircle_scales[properties[i]] = [
                        [{zoom:6 ,value: calResults["min"]},1],
                        [{zoom:6 ,value: calResults["first_quart"]},3],
                        [{zoom:6 ,value: calResults["mid"]},5],
                        [{zoom:6 ,value: calResults["second_quart"]},8],
                        [{zoom:6 ,value: calResults["max"]},11],
                        [{zoom:10 ,value: calResults["min"]},2],
                        [{zoom:10 ,value: calResults["first_quart"]},6],
                        [{zoom:10 ,value: calResults["mid"]},10],
                        [{zoom:10 ,value: calResults["second_quart"]},14],
                        [{zoom:10 ,value: calResults["max"]},20]
                    ];
                }else{
                    this.mapCircle_scales[properties[i]] = [
                        [{zoom:6 ,value: calResults["min"]},1],
                        [{zoom:6 ,value: calResults["first_quart"]},3],
                        [{zoom:6 ,value: calResults["mid"]},5],
                        [{zoom:6 ,value: calResults["second_quart"]},8],
                        [{zoom:6 ,value: calResults["max"]},11],
                        [{zoom:10 ,value: calResults["min"]},2],
                        [{zoom:10 ,value: calResults["first_quart"]},6],
                        [{zoom:10 ,value: calResults["mid"]},10],
                        [{zoom:10 ,value: calResults["second_quart"]},14],
                        [{zoom:10 ,value: calResults["max"]},20]
                    ];
                }
            }
        }

    }

    class V2TArray extends V2T.Base {
        constructor(name,label, unit, nComponents, nTuples, dataType, data, time=0) {
            super();
            this.name = name; // for example `confirmed_per10k`
            this.label = label; // which is used in text, for example 'confirmed cases per 10000 people'
            this.unit = unit; // unit of values, for example 'people, dollar etc'
            this.nComponents = nComponents; // 1 for scalar data, 2 for vectors and length of date for time-series
            this.nTuples = nTuples; // number of component pairs
            this.dataType = dataType; // e.g. number, string
            this.data = data; // FloatArray32 or simple JS array [] in the size of nComponents*nTuples
            this.time = time; // dates in a array if this is time-series, otherwise, time is set to 0 by default.
        }
    }

    class V2TDataSet extends V2T.Base {

        constructor(pointDataKeys, pointAxis, pointLabels, data) {
            super();
            this.uuid = 0; // some unique id
            this.nPoints = 0; // number of points in the dataset (e.g., 52 states)
            this.pointData = {}; // container for all vtkArrays whose entries are associated with individual points (individual states)
            this.fieldData = {}; // container for global information about all points (all states)
            this.generate_v2TDataSet(pointDataKeys, pointAxis, pointLabels, data)
        }

        getDateArr(){
            let listDate = [];
            let startDate ='2020-01-23';
            let endDate = '2020-09-23';
            let dateMove = new Date(startDate);
            let strDate = startDate;

            while (strDate < endDate){
                strDate = dateMove.toISOString().slice(0,10);
                listDate.push(strDate);
                dateMove.setDate(dateMove.getDate()+1);
            }
            return listDate;
        }

        generate_v2TDataSet(pointDataKeys, pointAxis, pointLabels, data) {
            // this.data_set = new V2T.v2TDataSet();

            // first remove duplicates by UID code
            let unique_data = {};
            for (let i = 0; i < data.length; i++)
                unique_data[data[i]['properties']['UID']] = data[i]['properties'];

            // Override the old data with the new duplicate free data
            data = Object.values(unique_data);

            $.each(pointDataKeys, (key_index, key_element) => {
                let data_array = data.map(a => a[key_element]);
                //console.log(data_array);
                let data_label = key_element;

                if(!key_element.includes("time_series_")){
                    this.pointData[key_element] =
                    new V2T.V2TArray(
                        key_element,
                        data_label,
                        'people',
                        1,
                        data_array.length,
                        typeof data_array[0],
                        data_array
                    );
                }else{
                    // handle time series
                    let date_arr = this.getDateArr();
                    
                    this.pointData[key_element] =
                    new V2T.V2TArray(
                        key_element,
                        data_label,
                        'people',
                        date_arr.length,
                        data_array.length,
                        typeof data_array[0],
                        data_array,
                        date_arr
                    );
                }
            });

            this.nPoints = data.length;

            //Setting some field data
            this.fieldData = {};
            this.fieldData["pointAxis"] = pointAxis;
            this.fieldData["pointLabels"] = pointLabels;
            this.fieldData["scalarNames"] = pointDataKeys.filter(n => !pointAxis.includes(n));
        }


        get1DDataFormattedForD3(x_key){
            return this.pointData[x_key].data.map((element, index) => [
                index,
                element
            ])
        }

        get2DDataFormattedForD3(x_key, y_key){
            return this.pointData[x_key].data.map((element, index) => [
                index,
                element,
                this.pointData[y_key].data[index]
            ])
        }

        get3DDataFormattedForD3(x_key, y_key, z_key){
            return this.pointData[x_key].data.map((element, index) => [
                index,
                element,
                this.pointData[y_key].data[index],
                this.pointData[z_key].data[index]
            ])
        }

        get4DDataFormattedForD3(x_key, y_key, z_key, w_key){
            return this.pointData[x_key].data.map((element, index) => [
                index,
                element,
                this.pointData[y_key].data[index],
                this.pointData[z_key].data[index],
                this.pointData[w_key].data[index]
            ])
        }

        getSubSetByIdList(id_list){
            let amount_points = id_list.length;

            // DEEP copy current data_obj
            let new_data_set = _.cloneDeep(this);
            new_data_set.nPoints = amount_points;

            // filter by id list
            $.each(new_data_set.pointData, (index,element) => {
                element.data = element.data.filter((item, index) => {return id_list.includes(index)});
                element.nTuples = amount_points;
            });

            return new_data_set;
        }
    }

    class analyzingList extends V2T.Base {
        constructor(){
            super();
            /*
            data_obj = {
                activeID: 01,
                state: "",
                state_id: id,
                V2TData: V2TdataObj,
                mapData: sub_geojson_obj,
                mapboxData: obj,
                main_plot_obj: obj
            }
            */
            this.analyzing_list = [];
            this.focus_analyzing_obj = {};
        }

        pushToList(data_obj){
            this.analyzing_list.push(data_obj);
        }

        getList(){
            return this.analyzing_list;
        }

        getDataObj(activeID){
            let active = activeID;
            for(let i=this.analyzing_list.length-1; i>=0; i--)
                if(this.analyzing_list[i].activeID === active)
                    return this.analyzing_list[i];
        }

        removeFromList(activeID){
            let active = activeID;
            for(let i=this.analyzing_list.length-1; i>=0; i--)
                if(this.analyzing_list[i].activeID === active)
                    this.analyzing_list.splice(i,1);
                    //console.log(this.analyzing_list);
        }

        setFocusObj(data_obj){
            this.focus_analyzing_obj = data_obj;
        }

        removeFocusObj(){
            this.focus_analyzing_obj = {};
        }

    }

    // Expose v2TArray and v2TDataSet
    window.V2T.V2TArray = V2TArray;
    window.V2T.V2TDataSet = V2TDataSet;
    window.V2T.V2TGlobalData = V2TGlobalData;
    window.V2T.analyzingList = analyzingList;


})();
