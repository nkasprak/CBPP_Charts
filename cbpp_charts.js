/*Wrapper for Flot Line Charts
with CBPP style defaults and 
other functionality

by Nick Kasprak*/

/*globals CBPP*/
(function() {
    "use strict";
    if (typeof(CBPP.Charts)!=="undefined") {
        return false;
    }
    CBPP.Charts = {};
    CBPP.Charts.ready = false;
    
    /*load dependencies*/
    CBPP.Charts.load = function(callback, options) {
        var CBPP_URL_ROOT = CBPP.Charts.urlBase = CBPP.urlBase + "CBPP_Charts/v" + CBPP.Charts.version + "/";
        var thisChartLoaded = false;
        var urlBase = CBPP.Charts.urlBase;
        var flotLoaded = false, cssLoaded = false, excanvasloaded;
        function isCanvasSupported(){
            var elem = document.createElement('canvas');
            return !!(elem.getContext && elem.getContext('2d'));
        }
        if (!isCanvasSupported()) {
            excanvasloaded = false;
            $.getScript(urlBase + "/flot/excanvas.min.js", function() {
                excanvasloaded = true;
                ready();
            });
        } else {
            excanvasloaded = true;
        }
        var flotOnLoad = function() {
            flotLoaded = true;
            if (typeof(options)==="undefined") {
                options = {};
            }
            
            /*var pluginsRequested = 0,
                pluginCallback = function() {
                pluginsRequested--;
                tryReady();
            };*/
            /*if (options.extraFlotPlugins.length > 0) {
                for (var i = 0, ii = options.extraFlotPlugins.length; i<ii; i++) {
                    pluginsRequested++;
                    $.getScript(urlBase + "flot/jquery.flot." + options.extraFlotPlugins[i] + ".js", pluginCallback);
                }
            }*/
            ready();
        };
        CBPP.JS(CBPP_URL_ROOT + "flot/jquery.flot.min.js", flotOnLoad);
        function loadCSS() {
            cssLoaded = true;
            ready();
        }
        CBPP.CSS(CBPP_URL_ROOT + "cbpp_charts.css", loadCSS);
        
        function ready() {
            if (flotLoaded && cssLoaded && excanvasloaded && !thisChartLoaded) {
                CBPP.Charts.ready = true;
                callback();
                //CBPP.Chart.loaded = true;
                thisChartLoaded = true;
            }
        }
    
        /*fallback in case browser doesn't support CSS onload*/
        setTimeout(loadCSS,1000);
    };
    
    CBPP.Charts.utilities = {
        csvParser: function(csvString) {
            var n;
            csvString = csvString.split("\r\n");
            for (var i = 0, ii = csvString.length; i<ii; i++) {
                csvString[i] = csvString[i].split(",");
                for (var j = 0, jj = csvString[i].length; j<jj; j++) {
                    if (csvString[i][j].length === 0) {
                        csvString[i][j] = null;
                    } else {
                        n = csvString[i][j]*1;
                        if (!isNaN(n)) {
                            csvString[i][j] = n;
                        }
                    }
                }
            }
            return csvString;
        },
        dataOrganizer: function(arr) {
            var rArr = [];
            for (var i = 1,ii=arr.length;i<ii;i++) {
                for (var j = 1,jj = arr[i].length;j<jj;j++) {
                    if (typeof(rArr[j-1])==="undefined") { 
                        rArr[j-1] = [];
                    }
                    if (arr[i][j] !== null ) {
                        rArr[j-1].push([arr[i][0], arr[i][j]]);
                    }
                }
            }  
            return rArr;
        },
        categories: function (d,barWidth) {
            if (typeof(barWidth)==="undefined") {
                barWidth = 0.8;
            }
            var c=[];
            function arrToObj(a) {
                var o = {}, i, ii, j, jj;
                for (i = 0,ii = a.length;i<ii;i++) {
                    o[a[i][0]] = [];
                    for (j = 1,jj = a[i].length;j<jj;j++) {
                        o[a[i][0]].push(a[i][j]);
                    }
                }
                return o;
            }
            var a = [], dObj = [], i, ii, j, jj;
            for (i = 0,ii = d.length;i<ii;i++) {
                dObj[i] = arrToObj(d[i]);
                a[i] = [];
                for (j = 0,jj = d[0].length;j<jj;j++) {
                    if (i===0){
                        c[j] = d[0][j][0];
                    }
                    a[i].push([j - barWidth/2 + i/ii*barWidth, dObj[i][c[j]][0]]);
                }
            } 
            return {
                data: a,
                categories: c,
                tF: function(c) {
                    return function(i) {
                        if (typeof(c[i])==="undefined") {
                            return "";
                        }
                        return c[i];
                    };
                },
                barWidth: barWidth,
                wrapperType: "categories"
            };
        },
        getData: function(dataSource, id, callback) {
            if (typeof(dataSource) === "object") {
                callback(dataSource);
            } else {
                var urlBase = "";
                if ($("script[data-cbppchart='"+id+"']").length > 0) {
                    urlBase = $("script[data-cbppchart='"+id+"']")[0].src.split("/");
                    urlBase.splice(-1);
                    urlBase = urlBase.join("/");
                    urlBase += "/";
                }
                $.get(urlBase + dataSource, null, callback, "text");
            }
        }
    };
    /*end utility functions*/
    
    /*chart constructor*/
    CBPP.Charts.Chart = function(div_selector, data, dataOptions, globalOptions, uAnnotations) {
        
        
        if (CBPP.Charts.ready === false) {
            console.error("CBPP_Chart not ready yet");
            return false;
        }

        /*defaults*/
        if (typeof(data)==="undefined") {
            data = [[[0,0],[1,1]]];
        }
        if (typeof(dataOptions)==="undefined") {
            dataOptions = [];
        }
        if (typeof(globalOptions)==="undefined") {
            globalOptions = {};
        }
        if (typeof(uAnnotations)==="undefined") {
            uAnnotations = [];
        }

        /*default global options*/
        (function(d) {
            if (typeof(d.xaxis)==="undefined") {
                d.xaxis = {};
            }
            if (typeof(d.yaxis)==="undefined") {
                d.yaxis = {};
            }
        })(globalOptions);
                    
        /*reshuffles some elements of these things for defined wrappers*/
        function organizeWrapper(data, dataOptions, globalOptions) {
            if (typeof(data.wrapperType) !== "undefined") {
                if (data.wrapperType === "categories") {
                    if (typeof(globalOptions.xaxis)==="undefined") {
                        globalOptions.xaxis = {};
                    }
                    globalOptions.xaxis.tickFormatter = data.tF(data.categories);
                    globalOptions.xaxis.min = 0 - data.barWidth*0.6;
                    globalOptions.xaxis.max = data.categories.length - 1 + data.barWidth*0.6;
                    $.extend(true, globalOptions, {series:{bars:{show:true}},bars:{barWidth:data.barWidth}});
                    globalOptions.cbpp_xaxis_labelTicks = 1;
                    if (typeof(globalOptions.cbpp_xaxis_majorOffset)==="undefined") {
                        globalOptions.cbpp_xaxis_majorOffset = 0.5;
                    }
                    data = data.data;
                }
            }
            /*default data options*/
            (function() {
                var d = data;
                var r = [];
                for (var i = 0,ii=d.length;i<ii;i++) {
                    r[i] = {};
                    r[i].data = d[i];
                    r[i].shadowSize = 0;
                    if (typeof(globalOptions.bars)!=="undefined") {
                        if (typeof(dataOptions[i])==="undefined") {
                            dataOptions[i] = {};
                        }
                        if (typeof(dataOptions[i].bars) === "undefined") {
                            if (typeof(globalOptions.bars.fill)!=="undefined") {
                                dataOptions[i].bars = {fill:globalOptions.bars.fill};
                            } else {
                                dataOptions[i].bars = {fill:1};
                            }
                        }
                    }
                    $.extend(true, r[i], dataOptions[i]);
                }
                data = r; 
            })();
            return {
                data: data,
                dataOptions: dataOptions,
                globalOptions: globalOptions
            };
        }
        var reshuffled = organizeWrapper(data, dataOptions, globalOptions);
        data = reshuffled.data;
        dataOptions = reshuffled.dataOptions;
        globalOptions = reshuffled.globalOptions;
        var c = {}, draw, annotations = [];
        
        if (typeof(uAnnotations) !== "undefined") {
            annotations = uAnnotations;
        }
        function destroy() {
            $(window).off("resize", null, resizeFunction);
            $(div_selector).empty();  
        }
        var resizeActions = {};
        function resizeFunction() {
            if (c.placeholder) {
                if (c.placeholder.height() > 0 && c.placeholder.width() > 0) {
                    c.placeholder.empty();
                    c.placeholder = null;
                    if (typeof(resizeActions.beforeDraw) === "function") {
                        resizeActions.beforeDraw();
                    }
                    draw();
                    if (typeof(resizeActions.afterDraw) === "function") {
                        resizeActions.afterDraw();
                    }
                }
            }
        }

        function hexToRGB (hexString) {
            if (typeof(hexString)==="undefined") {
                return [255,255,255];
            }
            function fix(h) {
                var r = "#";
                for (var i = 1; i<=3; i++) {
                    r += h.charAt(i) + h.charAt(i);
                }
                return r;
            }
            if (hexString.length === 4) {
                hexString = fix(hexString);
            }
            var r = parseInt(hexString.substr(1, 2), 16),
                g = parseInt(hexString.substr(3, 2), 16),
                b = parseInt(hexString.substr(5, 2), 16);
            return [r, g, b];
        }

        //And back the other way
        function RGBToHex (rgbArray) {
            function pad(num, size) {
                var s = "0" + num;
                return s.substr(s.length - size);
            }
            return "#" + pad(rgbArray[0].toString(16), 2) + pad(rgbArray[1].toString(16), 2) + pad(rgbArray[2].toString(16), 2);
        }

        function isColor(str) {
            var len = str.length;
            if (typeof(str) !== "string") {
                return false;
            }
            if (len !== 4 && len !== 7) {
                return false;
            }
            if (str.charAt(0) !== "#") {
                return false;
            }
            for (var i = 1; i<len; i++) {
                if ("abcdef".indexOf(str[i]) === -1 && isNaN(str[i]*1)) {
                    return false;
                }
            }
            return true;
        }
        function interpColor(p, c1, c2) {
            var c1Arr = hexToRGB(c1);
            var c2Arr = hexToRGB(c2);
            var c3Arr = [];
            for (var i = 0;i<3;i++) {
                c3Arr[i] = Math.round((1-p)*c1Arr[i] + p*c2Arr[i]);
            }
            return RGBToHex(c3Arr);
        }
        function animateTo(duration, newData, newDataOptions, newGlobalOptions) {
            if (typeof(newData)==="undefined" || newData === null) {newData = [];}
            if (typeof(newDataOptions)==="undefined" || newDataOptions === null) {newDataOptions = [];}
            if (typeof(newGlobalOptions)==="undefined" || newGlobalOptions === null) {newGlobalOptions = {};}
            function interpolate(p, obj1, obj2) {
                var i, ii, r;
                if (Object.prototype.toString.call(obj1) === "[object Array]" && Object.prototype.toString.call(obj2) === "[object Array]") {
                    //array loop
                    r = [];
                    for (i = 0,ii=obj1.length;i<ii;i++) {
                        r[i] = interpolate(p, obj1[i], obj2[i]);
                    }
                    return r;
                }
                if (typeof obj1 === "object" && typeof obj2 === "object" && obj1 !== null && obj2 !== null) {
                    //object loop
                    r = {};
                    for (i in obj1) {
                        if (obj1.hasOwnProperty(i)) {
                            if (obj2.hasOwnProperty(i)) {
                                r[i] = interpolate(p, obj1[i], obj2[i]);
                            } else {
                                r[i] = obj1[i];
                            }
                        }
                    }
                    return r;
                }
                if (isColor(obj1) && isColor(obj2)) {
                    return interpColor(p, obj1, obj2);  
                }
                if (isNaN(obj1*1) || isNaN(obj2*1)) {
                    return obj1; /*non numeric item*/
                } else {
                    return (1-p)*obj1 + p*obj2;
                }
            }

            var FRAME_DURATION = 20;
            var numFrames = Math.ceil(duration/FRAME_DURATION);
            var progress = 0;
            var startData = [];
            var startDataOptions = [];
            var startGlobalOptions = {};
            var reshuffled = organizeWrapper(newData, newDataOptions, newGlobalOptions);
            newData = reshuffled.data;
            newDataOptions = reshuffled.newDataOptions;
            newGlobalOptions = reshuffled.globalOptions;
            $.extend(true, startData, data);
            $.extend(true, startDataOptions, dataOptions);
            $.extend(true, startGlobalOptions, globalOptions);
            
            var a = setInterval(function() {
                progress += 1;
                if (progress >= numFrames) {
                    progress = numFrames;
                    /*change non-numeric values*/
                    $.extend(true, data, newData);
                    $.extend(true, dataOptions, newDataOptions);
                    $.extend(true, globalOptions, newGlobalOptions);
                    clearInterval(a);
                } else {
                    data = interpolate(progress/numFrames, startData, newData);
                    dataOptions = interpolate(progress/numFrames, startDataOptions, newDataOptions);
                    globalOptions = interpolate(progress/numFrames, startGlobalOptions, newGlobalOptions);
                }
                makeChart();
                draw();
            }, FRAME_DURATION);
            return a;
        }
        
        var options;
        function makeChart() {
            function addAnnotations() {
                var offset, /*point offset*/ 
                    aDOM, /*dom element for annotation*/
                    wEl, /*wrapper around annotation element*/
                    align = "left" /*default annotation alignment*/,
                    lineClass,
                    pointClass,
                    vOffset,
                    direction;
                for (var i = 0, ii = annotations.length; i < ii; i++) {
                    offset = c.plot.pointOffset({x: annotations[i].x, y: annotations[i].y});
                    lineClass = '';
                    pointClass = '';
                    if (annotations[i].showLine !== "undefined") {
                        if (annotations[i].showLine === false) {
                            lineClass = " hide";
                        }
                    }
                    if (annotations[i].showPoint !== "undefined") {
                        if (annotations[i].showPoint === false) {
                            pointClass = " hide";
                        }
                    }
                    wEl = $("<div class='aWrap'><div class='vLine" + lineClass + "'></div><div class='circle" + pointClass + "'></div></div>");
                    aDOM = $("<div>");
                    aDOM.html(annotations[i].content);
                    wEl.css("position","absolute");
                    wEl.css("left",offset.left);
                    wEl.css("top",offset.top);
                    aDOM.css("position","absolute");
                    if (typeof(annotations[i].align) !== "undefined") {
                        align = annotations[i].align; 
                    }
                    direction = "up";
                    if (typeof(annotations[i].direction) !== "undefined") {
                        direction = "down";
                    }
                    vOffset = 30;
                    if (typeof(annotations[i].vOffset) !== "undefined") {
                        vOffset = annotations[i].vOffset;
                    }
                    vOffset = vOffset + "px";
                
                    aDOM.css(align,"-15px");
                    if (direction === "up") {
                        aDOM.css("bottom",vOffset);
                    } else {
                        wEl.find(".vLine").css("bottom","auto");
                        wEl.find(".vLine").css("top","0px");
                        aDOM.css("top",vOffset); 
                    }
                    aDOM.css("width",annotations[i].width);
                    aDOM.addClass("annotation");
                    if (typeof(annotations[i].whiteBackground)!=="undefined") {
                        if (annotations[i].whiteBackground === false) {
                            aDOM.addClass("transparent");
                        }
                    }
                    wEl.append(aDOM);
                    c.placeholder.append(wEl);
                }
            }
            function addLegend() {
                var data = c.plot.getData();
                if (typeof(c.legend)!=="undefined") {
                    c.legend.remove();
                }
                var legend = c.legend = $("<div class='cbppChartLegend'></div>"),
                    ul = $("<ul>"),
                    li,
                    itemClass = "legendLine";
                if (globalOptions.cbpp_legend.type === "box") {
                    itemClass = "legendBox";
                }
                for (var i = 0, ii = data.length; i<ii; i++) {
                    li = $("<li>");
                    li.append($("<div class='" + itemClass + "' style='background-color:" + data[i].color + "' ></div>"));
                    li.append($("<div class='legendLabel'>" + data[i].label + "</div>"));
                    ul.append(li);
                }
                legend.append(ul);
                if (typeof(globalOptions.cbpp_legend.outsideLocation)!=="undefined") {
                    legend.css("position","relative");
                    $(globalOptions.cbpp_legend.outsideLocation).append(legend);
                } else {
                    legend.css("top",globalOptions.cbpp_legend.top + "%");
                    legend.css("left", globalOptions.cbpp_legend.left + "%");
                    c.placeholder.append(legend);
                }
            }
            function add0Axis(y) {
                var xaxis = c.plot.getXAxes()[0],
                    left = xaxis.min,
                    origin = c.plot.p2c({x:left,y:y}),
                    right = xaxis.max,
                    zeroLine = $("<div class='zeroLine'></div>"),
                    offset = c.plot.getPlotOffset(),
                    width = c.plot.p2c({x:right,y:y}).left - origin.left;
                    
                zeroLine.css("cssText","width:"+Math.round(width + 2) + "px !important");
                zeroLine.css("top", Math.round(origin.top + offset.top - 1) + "px");
                zeroLine.css("left", Math.round(origin.left + offset.left - 1) + "px");
                c.placeholder.append(zeroLine);
        
            }
            function addLabels() {
                var x, y;
                if (typeof(globalOptions.bars) !== "undefined") {
                    if (typeof(globalOptions.bars.barWidth)==="undefined") {
                        globalOptions.bars.barWidth = 1;
                    }
                    if (typeof(globalOptions.bars.labels) !== "undefined") {
                        if (globalOptions.bars.labels.show === true) {
                            var _data = c.plot.getData(), o, label, wrapper, data;
                            for (var j = 0, jj = _data.length; j<jj; j++) {
                                data = _data[j].data;
                                for (var i = 0, ii = data.length; i<ii; i++) {
                                    x = data[i][0];
                                    y = data[i][1];
                                    if (typeof(globalOptions.bars.labels.customXY)==="function") {
                                        var xy = globalOptions.bars.labels.customXY(i);
                                        x = xy.x;
                                        y = xy.y;
                                    }
                                    o = c.plot.pointOffset({x:x + globalOptions.bars.barWidth/2, y:y});
                                    wrapper = $("<div class='labelWrapper' style='left:" + o.left + "px;top:" + o.top + "px'></div>");
                                    label = $("<div class='label'>" + globalOptions.bars.labels.formatter(data[i],j) + "</div>");
                                    wrapper.append(label);
                                    c.placeholder.append(wrapper);
                                }
                            } 
                        }
                    }
                }
            }
            function setupResize() {
                if (typeof(c.resized) === "undefined") {
                    $(window).on("resize", null, resizeFunction);
                    c.resized = true;
                }
            }
            setupResize();
            
            draw = function() {
                $(div_selector).addClass("cbppInteractiveChart");
                c.placeholder = $(div_selector);
                c.plot = $.plot(div_selector, data, options);
                if (typeof(options.cbpp_tooltipMaker) === "function") {
                    c.placeholder.unbind("plothover");
                    c.placeholder.bind("plothover", hover);
                }
                addAnnotations();
                if (typeof(options.cbpp_legend) !== "undefined") {
                    if (options.cbpp_legend.show !== false) {
                        addLegend();
                    }
                }

                
                addLabels();
                var yaxis = c.plot.getYAxes()[0],
                    chartYMin = yaxis.min,
                    chartYMax = yaxis.max;
                if (typeof(options.cbpp_hideBottomLine)==="undefined") {
                    options.cbpp_hideBottomLine = false;
                }
                if (chartYMin <= 0 && chartYMax > 0) {add0Axis(0);}
                if (chartYMin !== 0 && !options.cbpp_hideBottomLine) {
                    add0Axis(chartYMin);
                }
            };
            function hover(event, pos, item) {
                c.placeholder.find(".tooltip").remove();
                if (typeof(options.cbpp_tooltipMaker)!=="function") {
                    return false;
                }
                var classString = "",offsetDirection = {};
                if (item !== null) {
                    var pos_x = item.datapoint[0],
                        pos_y = item.datapoint[1],
                        x = pos_x,
                        y = pos_y;
                    var tooltipText = options.cbpp_tooltipMaker(x, y, item.series);
                    if (tooltipText === null) {
                        return;
                    }
                    if (typeof(item.series.bars) !== "undefined") {
                        if (item.series.bars.show) {
                            pos_x = pos.x;
                            pos_y = pos.y;
                        }
                    }
                    var offset = c.plot.pointOffset({x:pos_x,y:pos_y});
                    if (offset.left > c.placeholder.width()*0.5) {
                        classString += "east";
                        offsetDirection.h = -1;
                    } else {
                        classString += "west";
                        offsetDirection.h = 1;
                    }
                    classString += " ";
                    if (offset.top > c.placeholder.height()*0.5) {
                        classString += "south";
                        offsetDirection.v = -1;
                    } else {
                        classString += "north";
                        offsetDirection.v = 1;
                    }
                    var tooltip = $("<div class='tooltip " + classString + "'><div class='anchor'>" + tooltipText + "</div></div>");

                    tooltip.css("left", (offset.left + offsetDirection.h*10) + "px");
                    tooltip.css("top", (offset.top + offsetDirection.v*10) + "px");
                    c.placeholder.append(tooltip);
                }
            }
            function setupGridMarkings() {
                c.markingsStorage = [];
                function makeMarking(x, percentHeight) {
                    return {
                        color : "#666",
                        lineWidth: 2,
                        xaxis: {
                            from: x,
                            to: x
                        },
                        yaxis: {
                            from: c.bounds.y.min,
                            to: percentHeight * (c.bounds.y.max - c.bounds.y.min) + c.bounds.y.min
                        }  
                    };
                }
                var majorOffset = 0;
                if (typeof(globalOptions.cbpp_xaxis_majorOffset)!=="undefined") {
                    majorOffset = globalOptions.cbpp_xaxis_majorOffset;
                }
                var rounding = 1;
                if (typeof(globalOptions.cbpp_xaxis_majorTicks)==="number") {
                    rounding = globalOptions.cbpp_xaxis_majorTicks;
                }
                var xMin = Math.round(c.bounds.x.min/rounding)*rounding;
                var xMax = Math.round(c.bounds.x.max/rounding)*rounding;
                var x;
                if (typeof(globalOptions.cbpp_xaxis_majorTicks)!=="undefined") {
                    for (x = xMin + majorOffset; x<=xMax;x+=globalOptions.cbpp_xaxis_majorTicks) {
                        c.markingsStorage.push(makeMarking(x,0.04));
                    }
                }
                if (typeof(globalOptions.cbpp_xaxis_minorTicks)!=="undefined") {
                    for (x = xMin; x<=xMax;x+=globalOptions.cbpp_xaxis_minorTicks) {
                        c.markingsStorage.push(makeMarking(x,0.02));
                    }
                }
            }
            /*needed for special ticks*/
            var RangeFinder = function() {
                var ranges;
                var findRange = function() {
                    var i, ii, j, jj, xmin, xmax, ymin, ymax;
                    for (i = 0, ii = data.length; i<ii; i++) {
                        for (j = 0, jj = data[i].data.length; j<jj; j++) {
                            if (typeof(xmin)==="undefined") {
                                xmin = data[i].data[j][0];
                            }
                            if (typeof(xmax)==="undefined") {
                                xmax = data[i].data[j][0];
                            }
                            if (typeof(ymin)==="undefined") {
                                ymin = data[i].data[j][1];
                            }
                            if (typeof(ymax)==="undefined") {
                                ymax = data[i].data[j][1];
                            }
                            xmin = Math.min(xmin, data[i].data[j][0]);
                            xmax = Math.max(xmax, data[i].data[j][0]);
                            ymin = Math.min(ymin, data[i].data[j][1]);
                            ymax = Math.max(ymax, data[i].data[j][1]);
                        }
                    }
                    return {
                        x: {
                            min:xmin,max:xmax
                        },
                        y: {
                            min:ymin,max:ymax
                        }
                    };
                };
                this.getXMin = function() {
                    if (typeof(this.ranges)==="undefined") {
                        ranges = findRange();
                    }
                    return ranges.x.min;
                };
                this.getXMax = function() {
                    if (typeof(ranges)==="undefined") {
                        ranges = findRange();
                    }
                    return ranges.x.max;
                };
                this.getYMin = function() {
                    if (typeof(ranges)==="undefined") {
                        ranges = findRange();
                    }
                    return ranges.y.min;
                };
                this.getYMax = function() {
                    if (typeof(ranges)==="undefined") {
                        ranges = findRange();
                    }
                    return ranges.y.max;
                };
            }, ranges = new RangeFinder();
            if (typeof(globalOptions.xaxis.min) === "undefined") {
                globalOptions.xaxis.min = ranges.getXMin();
            }
            if (typeof(globalOptions.xaxis.max) === "undefined") {
                globalOptions.xaxis.max = ranges.getXMax();
            }
            if (typeof(globalOptions.yaxis.min) === "undefined") {
                globalOptions.yaxis.min = ranges.getYMin();
            }
            if (typeof(globalOptions.yaxis.max) === "undefined") {
                globalOptions.yaxis.max = ranges.getYMax();
            }
            
            
            c.bounds = {x:{},y:{}};
            c.bounds.y.max = globalOptions.yaxis.max;
            c.bounds.y.min = globalOptions.yaxis.min;
            c.bounds.x.max = globalOptions.xaxis.max;
            c.bounds.x.min = globalOptions.xaxis.min;
            setupGridMarkings();
            
            if (c.bounds.y.min !== 0) {
                c.markingsStorage.push({
                    color: "#666",
                    lineWidth: 2,
                    yaxis: {
                        from: 0,
                        to: 0
                    }
                });
            }
            options = {
                grid: {
                    borderWidth:0,
                    hoverable:true,
                    markings: c.markingsStorage,
                    color:"#666"
                },
                lines: {
                    lineWidth: 5
                },
                legend: {show: false},
                xaxis: {
                    tickLength: 0,
                    color:"#600"
                },
                yaxis: {
                    color:"#600",
                    tickColor:"#ccc"
                }
            };
            
            if (typeof(globalOptions.cbpp_xaxis_labelTicks) !== "undefined") {
                options.xaxis.tickSize = globalOptions.cbpp_xaxis_labelTicks;
            } else if (typeof(globalOptions.cbpp_xaxis_majorTicks) !== "undefined") {
                options.xaxis.tickSize = globalOptions.cbpp_xaxis_majorTicks;
            }
            $.extend(true, options, globalOptions);
            
        }
        makeChart();
        this.draw = draw;
        this.destroy = destroy;
        this.remakeChart = makeChart;
        this.getData = function() {
            var arr = [];
                $.extend(true, arr, data);
                return arr;
        };
        this.clearData = function() {
            data = null;
        };
        this.onResize = function(d) {
            resizeActions = d;
        };
        this.setData = function(newData) {
            var d = [];
            $.extend(true, d, newData);
            var reshuffled = organizeWrapper(d, dataOptions, globalOptions);
            data = reshuffled.data;
            dataOptions = reshuffled.dataOptions;
            globalOptions = reshuffled.globalOptions;
        };
        this.setAnnotations = function(newAnnotations) {
            annotations = newAnnotations; 
        };
        this.getAnnotations = function() {
            var arr = [];
            $.extend(arr, annotations);
            return arr;   
        };
        this.getDataOptions = function() {
            var arr = [];
            $.extend(true,arr,dataOptions);
            return arr;
        };
        this.clearDataOptions = function() {
            dataOptions = [];
        };
        this.setDataOptions = function(newDataOptions) {
            $.extend(true, dataOptions, newDataOptions);
        };
        this.getGlobalOptions=  function() {
            var o = {};
            $.extend(true,o, globalOptions);
            return o;
        };
        this.clearGlobalOptions= function() {
            globalOptions = {};
        };
        this.setGlobalOptions= function(newOptions) {
            $.extend(true, globalOptions, newOptions);
        };
        this.getPlot= function() {
            return c.plot;
        };
        this.animateTo = function(duration, data, dataOptions, globalOptions) {
            var a = animateTo(duration, data, dataOptions, globalOptions);
            return a;
        };
    };
    /*end chart constructor*/
})();