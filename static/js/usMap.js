var us;
var data;
const width = 975;
const height = 610;
var __sortOpts = {
    key: 'overall',
    score: 'scores_overall',
    rank: 'scores_overall_rank'
};
var __sortOptions = [{
        key: 'overall',
        score: 'scores_overall',
        rank: 'scores_overall_rank'
    },
    {
        key: 'engagement',
        score: 'scores_engagement',
        rank: 'scores_engagement_rank'
    },
    {
        key: 'environment',
        score: 'scores_environment',
        rank: 'scores_environment_rank'
    },
    {
        key: 'outcomes',
        score: 'scores_outcomes',
        rank: 'scores_outcomes_rank'
    },
    {
        key: 'resources',
        score: 'scores_resources',
        rank: 'scores_resources_rank'
    }
];
const defaultRange = [0, 100];
var __range = defaultRange;
var __selectedItem = {};
/*** d3 control object ***/
var path = d3.geoPath();
var color = d3.scaleSequential(d3.interpolatePuBu).domain([0, 1]);
var dispatch = d3.dispatch("load", "stateChange", "selectDetail", "reset");
var projection = d3.geoAlbersUsa().scale(1300).translate([width / 2, height / 2]) // center of viewbox


/*** Function ***/
async function init() {
    us = await d3.json("../static/data/states-albers-10m.json");
    data = await d3.csv("../static/data/usUni.csv")
}

function getFilterData() {
    var sortBy = __sortOpts.rank;
    return data.filter(el => Number(el[sortBy]) >= __range[0] && Number(el[sortBy]) <= __range[1]);
}

dispatch.on('load.map', async function createChart() {
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);

    const svg = d3.select("#usMap").append("svg")
        .attr("viewBox", [0, 0, width, height])
        .on('click', resetView)
    const g = svg.append('g');

    const states = g.append("g")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .join("path")
        .on('click', zoomIn)
        .attr("fill", "#7FA2C7")
        .attr("d", path)

    states.append("title")
        .text(d => `${d.properties.name}`);

    g.append("path")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path);

    var uniSvg = g.append("g")
        .attr("text-anchor", "middle")
        .attr("id", "uniLocation")

    var filterData = getFilterData();
    renderLocation(filterData)
    svg.call(zoom);

    dispatch.on("stateChange.range", function() {
        var filterData = getFilterData();
        renderLocation(filterData);
    })

    function renderLocation(locations) {
        const getRange = (d) => {
            let rank = Number(d[__sortOpts.rank]);
            let r = 1 - (rank - __range[0]) / (__range[1] - __range[0]);
            return r > 0 ? r : 0;
        }
        uniSvg.selectAll('g').remove();
        var uniItem = uniSvg.selectAll("g#uniLocation")
            .data(locations)
        uniItem.enter()
            .append("g")
            .attr("transform", function(d) {
                return `translate(${projection([d.longitude, d.latitude]).join(',')})`
            })
            .append('circle')
            .on('click', selectUni)
            .attr("r", function(d) {
                return 12 * getRange(d) + 3;
            })
            .attr("fill", function(d) {
                return color(getRange(d));
            })
            .attr('stroke', 'white')
            .attr('stroke-width', 0.2)
            .append("title")
            .text(d => `${d.name}
            - Rank: ${d[__sortOpts.rank]}`)

        uniItem.exit().remove();
    };

    function resetView() {
        states.transition().style("fill", null);
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
        );
    }

    function zoomIn(event, d) {
        const [
            [x0, y0],
            [x1, y1]
        ] = path.bounds(d);
        event.stopPropagation();
        states.transition().style("fill", null);
        d3.select(this).transition().style("fill", "#D32F2F");
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.pointer(event, svg.node())
        );
    }

    function zoomed(event) {
        const {
            transform
        } = event;
        g.attr("transform", transform);
        g.attr("stroke-width", 1 / transform.k);
    }

    function selectUni(event, d) {
        event.stopPropagation();
        d3.selectAll('circle').transition().style("fill", null);
        d3.select(this).transition().style("fill", "#C10723");
        __selectedItem = {...d };
        dispatch.call('selectDetail', this)
    }
});

dispatch.on("load.content", function createContent() {
    var content = d3.select("#detail")
    var cols = {
        // 'scores_overall': 'Overall',
        'scores_engagement': 'Engagement',
        'scores_environment': 'Environment',
        'scores_outcomes': 'Outcomes',
        'scores_resources': 'Resources'
    };

    var scoreChart = content.select('#scoreChart')
        .select('svg')
        .attr('width', 340)
        .attr('height', 200)

    var margin = 80;
    var width = scoreChart.attr('width') - margin;
    var height = scoreChart.attr('height') - margin;

    var xScale = d3.scaleLinear().range([0, width]).domain([0, 50]);
    var yScale = d3.scaleBand().rangeRound([height, 0]).domain(Object.keys(cols)).padding(0.2);

    var g = scoreChart.append("g")
    g.append("g")
        .attr("transform", `translate(65,${margin / 4})`)
        .call(d3.axisLeft(yScale).tickFormat(d => {
            return cols[d]
        }))
        .append("text")
        .attr("y", height)
        .attr("x", width - margin)
        .attr("text-anchor", "end")
        .attr("stroke", "black")

    g.append("g")
        .attr("transform", `translate(65, ${height + margin /4})`)
        .call(d3.axisBottom(xScale).ticks(7))
        .append("text")
        // .attr("x", 6)
        .attr("dx", "16em")
        .attr("dy", "4em")
        .attr("text-anchor", "end")
        .attr("stroke", "black")
        .text('Score')

    dispatch.on('selectDetail.detail', function() {
        content.style('display', 'block');
        content.select('#name').text(__selectedItem.name)
        content.select('#rank').text(`Rank ${__selectedItem[__sortOpts.rank]}`)
        content.select("#totalScore").text(`Total score: ${__selectedItem.scores_overall}`)
        var rows = Object.keys(cols).map(el => {
            return {
                key: el,
                value: __selectedItem[el]
            }
        });
        var bars = g.selectAll(".bar")
            .data(rows)
            .join("rect")
            .attr("class", "bar")
            .attr("x", '66')
            .attr('y', d => yScale(d.key) + margin / 4)
            .attr("height", yScale.bandwidth())
            .attr("opacity", 0.8)
            .transition()
            .duration(700)
            .attr("width", d => xScale(d.value))
            .attr("opacity", 1)

        g.selectAll('.bar-text')
            .data(rows)
            .join('text')
            .attr('class', 'bar-text')
            .attr('x', d => 66 + xScale(d.value))
            .attr('dx', "-1em")
            .attr('y', d => yScale(d.key) + margin / 4)
            .attr('dy', '1.5em')
            .attr("text-anchor", "end")
            .text(d => d.value)
    });

    dispatch.on('reset.scoreChart', function() {
        content.style('display', 'none');
    })
    dispatch.on('stateChange.scoreChart', function() {
        content.style('display', 'none');
    })
});

dispatch.on("load.sort", function createControl() {
    var select = d3.select("select#selectSort")
        .on("change", function(event) {
            __sortOpts = __sortOptions.find(el => el.key == this.value)
            dispatch.call("stateChange", this);
        });

    select.selectAll("option")
        .data(__sortOptions)
        .enter()
        .append("option")
        .attr("value", function(d) {
            return d.key;
        })
        .text(function(d) {
            return d.key;
        })
    dispatch.on("reset.sort", function() {
        console.log("reset.sort")
        __sortOpts = __sortOptions[0];
        select.property('value', __sortOpts.key)
    })
});

dispatch.on("load.bar", function() {
    var sliderRange = d3
        .sliderBottom()
        .min(0)
        .max(800)
        .width(300)
        .step(10)
        .tickValues([0, 100, 200, 300, 400, 500, 600, 700, 800])
        .default(__range)
        .fill('#2196f3')
        .on('end', val => {
            __range = val;
            dispatch.call("stateChange", this)
        });

    var gRange = d3
        .select('div#slider-range')
        .append('svg')
        .attr('width', 360)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)');

    gRange.call(sliderRange);
    dispatch.on("reset.bar", function() {
        console.log("reset.bar")
        __range = defaultRange;
        sliderRange.value(defaultRange);
    })
});

dispatch.on("load.reset", function reset() {
    var btn = d3.select("#resetBtn")
        .on('click', function(event) {
            console.log("load, reset")
            dispatch.call('reset', this);
            dispatch.call("stateChange", this)
            console.log("reset end")
        })
})

async function renderUsMap() {
    await init();
    dispatch.call('load', this);
}

renderUsMap();