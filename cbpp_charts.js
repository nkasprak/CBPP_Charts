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
    CBPP.Charts.load = function(callback) {
        CBPP.Charts.urlBase = CBPP.urlBase + "CBPP_Charts/v" + CBPP.Charts.version + "/";
        var thisChartLoaded = false;
        var urlBase = CBPP.Charts.urlBase;
        var flotLoaded = false, cssLoaded = false;
        $.getScript(urlBase + "flot/jquery.flot.min.js", function() {
            flotLoaded = true;
            ready();
        });
        var l = document.createElement("link");
        l.type="text/css";
        l.rel="stylesheet";
        l.href =  urlBase + 'cbpp_charts.css';
        function loadCSS() {
            cssLoaded = true;
            ready();
        }
        function cssLoadedCorrectly() {
            /*console.log("cssLoadedCorrectly");*/
            loadCSS();
        }
        l.onload = cssLoadedCorrectly;
        l.load = cssLoadedCorrectly;
        
        document.getElementsByTagName('head')[0].appendChild(l);
        function ready() {
            if (flotLoaded && cssLoaded && !thisChartLoaded) {
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
    CBPP.Charts.Chart = function(div_selector, data, dataOptions, userOptions, uAnnotations) {
        if (CBPP.Charts.ready === false) {
            console.error("CBPP_Chart not ready yet");
            return false;
        }

        /*defaults*/
        if (typeof(data)==="undefined") {
            data = [[[0,0],[1,1]]];
        }
        if (typeof(dataOptions)==="undefined") {
            dataOptions = {};
        }
        if (typeof(userOptions)==="undefined") {
            userOptions = {};
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
        })(userOptions);

        if (typeof(data.wrapperType) !== "undefined") {
            if (data.wrapperType === "categories") {
                userOptions.xaxis.tickFormatter = data.tF(data.categories);
                userOptions.xaxis.min = 0 - data.barWidth*0.6;
                userOptions.xaxis.max = data.categories.length - 1 + data.barWidth*0.6;
                $.extend(true, userOptions, {series:{bars:{show:true}},bars:{barWidth:data.barWidth}});
                userOptions.cbpp_xaxis_labelTicks = 1;
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
                if (typeof(userOptions.bars)!=="undefined") {
                    if (userOptions.bars.show) {
                        if (typeof(dataOptions[i].bars) === "undefined") {
                            dataOptions[i].bars = {};
                        }
                        dataOptions[i].bars.fillColor = dataOptions[i].color;
                        
                        dataOptions[i].bars.fill = 1;
                    }
                }
                $.extend(true, r[i], dataOptions[i]);
            }
            data = r; 
        })();
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
                var data = c.plot.getData(),
                    legend = $("<div class='legend'></div>"),
                    ul = $("<ul>"),
                    li,
                    itemClass = "legendLine";
                if (userOptions.cbpp_legend.type === "box") {
                    itemClass = "legendBox";
                }
                for (var i = 0, ii = data.length; i<ii; i++) {
                    li = $("<li>");
                    li.append($("<div class='" + itemClass + "' style='background-color:" + data[i].color + "' ></div>"));
                    li.append($("<div class='legendLabel'>" + data[i].label + "</div>"));
                    ul.append(li);
                }
                legend.append(ul);
                legend.css("top",userOptions.cbpp_legend.top + "%");
                legend.css("left", userOptions.cbpp_legend.left + "%");
                c.placeholder.append(legend);
            }
            function add0Axis(y) {
                var xaxis = c.plot.getXAxes()[0],
                    left = xaxis.min,
                    origin = c.plot.p2c({x:left,y:y}),
                    right = xaxis.max,
                    zeroLine = $("<div class='zeroLine'></div>"),
                    offset = c.plot.getPlotOffset(),
                    width = c.plot.p2c({x:right,y:y}).left - origin.left;
                zeroLine.css("top", Math.round(origin.top + offset.top - 1) + "px");
                zeroLine.css("left", Math.round(origin.left + offset.left - 1) + "px");
                zeroLine.css("width",Math.round(width + 2) + "px");
                c.placeholder.append(zeroLine);
        
            }
            function addLabels() {
                if (typeof(userOptions.bars) !== "undefined") {
                    if (typeof(userOptions.bars.labels) !== "undefined") {
                        if (userOptions.bars.labels.show === true) {
                            var data = c.plot.getData()[0].data, o, label, wrapper;
                            for (var i = 0, ii = data.length; i<ii; i++) {
                                o = c.plot.pointOffset({x:data[i][0] + userOptions.bars.barWidth/2, y:data[i][1]});
                                wrapper = $("<div class='labelWrapper' style='left:" + o.left + "px;top:" + o.top + "px'></div>");
                                label = $("<div class='label'>" + userOptions.bars.labels.formatter(data[i]) + "</div>");
                                wrapper.append(label);
                                c.placeholder.append(wrapper);
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
                add0Axis(0);
                addLabels();
                var chartYMin = c.plot.getYAxes()[0].min;
                if (chartYMin < 0) {
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
                    var tooltip = $("<div class='tooltip " + classString + "'><div class='anchor'>" + options.cbpp_tooltipMaker(x, y, item.series) + "</div></div>");
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
                if (typeof(userOptions.cbpp_xaxis_majorOffset)!=="undefined") {
                    majorOffset = userOptions.cbpp_xaxis_majorOffset;
                }
                var rounding = 1;
                if (typeof(userOptions.cbpp_xaxis_majorTicks)==="number") {
                    rounding = userOptions.cbpp_xaxis_majorTicks;
                }
                var xMin = Math.round(c.bounds.x.min/rounding)*rounding;
                var xMax = Math.round(c.bounds.x.max/rounding)*rounding;
                for (var x = xMin + majorOffset; x<=xMax;x+=userOptions.cbpp_xaxis_majorTicks) {
                    c.markingsStorage.push(makeMarking(x,0.04));
                }
                for (x = xMin; x<=xMax;x+=userOptions.cbpp_xaxis_minorTicks) {
                    c.markingsStorage.push(makeMarking(x,0.02));
                }
            }
            /*needed for special ticks*/
            var RangeFinder = function() {
                var ranges;
                var findRange = function() {
                    var i, ii, j, jj, xmin, xmax, ymin, ymax;
                    for (i = 0, ii = data.length; i<ii; i++) {
                        for (j = 0, jj = data[i].length; j<jj; j++) {
                            if (typeof(xmin)==="undefined") {
                                xmin = data[i][j][0];
                            }
                            if (typeof(xmax)==="undefined") {
                                xmax = data[i][j][0];
                            }
                            if (typeof(ymin)==="undefined") {
                                ymin = data[i][j][0];
                            }
                            if (typeof(ymax)==="undefined") {
                                ymax = data[i][j][0];
                            }
                            xmin = Math.min(xmin, data[i][j][0]);
                            xmax = Math.max(xmax, data[i][j][0]);
                            ymin = Math.min(ymin, data[i][j][1]);
                            ymax = Math.max(ymax, data[i][j][1]);
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
            if (typeof(userOptions.xaxis.min) === "undefined") {
                userOptions.xaxis.min = ranges.getXMin();
            }
            if (typeof(userOptions.xaxis.max) === "undefined") {
                userOptions.xaxis.max = ranges.getXMax();
            }
            if (typeof(userOptions.yaxis.min) === "undefined") {
                userOptions.yaxis.min = ranges.getYMin();
            }
            if (typeof(userOptions.yaxis.max) === "undefined") {
                userOptions.yaxis.max = ranges.getYMax();
            }
            
            
            c.bounds = {x:{},y:{}};
            c.bounds.y.max = userOptions.yaxis.max;
            c.bounds.y.min = userOptions.yaxis.min;
            c.bounds.x.max = userOptions.xaxis.max;
            c.bounds.x.min = userOptions.xaxis.min;
            
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
            var options = {
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
            
            if (typeof(userOptions.cbpp_xaxis_labelTicks) !== "undefined") {
                options.xaxis.tickSize = userOptions.cbpp_xaxis_labelTicks;
            } else if (typeof(userOptions.cbpp_xaxis_majorTicks) !== "undefined") {
                options.xaxis.tickSize = userOptions.cbpp_xaxis_majorTicks;
            }
            $.extend(true, options, userOptions);
            
            
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
            data = d;
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
        this.getUserOptions=  function() {
            var o = {};
            $.extend(true,o, userOptions);
            return o;
        };
        this.clearUserOptions= function() {
            userOptions = {};
        };
        this.setUserOptions= function(newOptions) {
            $.extend(true, userOptions, newOptions);
        };
        this.getPlot= function() {
            return c.plot;
        };
    };
    /*end chart constructor*/
})();