'use strict';

var d3 = require('d3'),
	_ = require('underscore'),
	$ = require('jquery'),
	moment = require('moment');

module.exports = function() {

	var stories = {};

	stories.draw = function(data, svgContainer, domain, width, height) {

		stories.tooltip = d3.select("body").append("div").attr("class", "story-content").style("opacity", 0);

		stories.svg = {
			x: {
				value: function(d) { return d.date; },
				scale: d3.time.scale().range([0, width]),
				map: function(d) { return stories.svg.x.scale(stories.svg.x.value(d)); }
			},
			y: {
				value: function(d) {
					var unix = d.date.unix();
					var volumeData = _.find(data, function(p) {
						return unix == p.date.getTime() / 1000;
					});

					if(volumeData) {
						return volumeData.volume;
					} else {
						return -1000;
					}
				},
				scale: d3.scale.linear().range([height, 220]),
				map: function(d) { return stories.svg.y.scale(stories.svg.y.value(d)) * 0.85; },
				offsetMap: function(d) { return stories.svg.y.scale(stories.svg.y.value(d)); }
			},
			node: svgContainer.append("g").attr("transform", "translate(0,0)").attr("class", "stories")
		};

		$.get('/events', function(data) {

			stories.data = data;
			_.each(stories.data, function(item) {
				item.date = moment(item.data, 'DD/MM/YYYY');
			});			

			stories.svg.x.scale.domain(domain.svg.x.domain());
			stories.svg.y.scale.domain(domain.svg.y.domain());

			var clusters = clusterize(stories.data);

			stories.svg.node
				.selectAll('line')
				.data(clusters)
					.enter().append('line')
					.attr("x1", function(d) { return d.cx; })
					.attr("y1", function(d) { return d.cy; })
					.attr("x2", function(d) { return d.cx; })
					.attr("y2", function(d) { return d.cyO; })
					.attr('class', 'story-line')
					.style({stroke: '#fc0', 'stroke-width': '1px', 'stroke-opacity': .5});

			stories.svg.node
				.selectAll(".story")
				.data(clusters)
					.enter().append("circle")
					.attr("class", function(d) {
						var c = 'story';
						if(d.stories.length > 1) {
							c += ' cluster';
						}
						return c;
					})
					.attr("r", 5)
					.attr("cx", function(d) { return d.cx; })
					.attr("cy", function(d) { return d.cy; })
					.on("mouseover", function(d) {
						stories.tooltip.transition()
							.duration(200)
							.style("opacity", 1);

							stories.tooltip.html('<h3>' + d.titulo + '</h3>')
							.style("left", (d3.event.pageX) + "px")
							.style("top", (d3.event.pageY) + "px");
					})
					.on("mousemove", function(d) {
						stories.tooltip
							.style("left", (d3.event.pageX) + "px")
							.style("top", (d3.event.pageY) + "px");
					})
					.on("mouseout", function(d) {
						stories.tooltip.transition()
							.duration(500)
							.style("opacity", 0);
					});

		}, 'json');

		return stories;

	};

	stories.hide = function() {
		stories.svg.node.style({'display': 'none'});
	};

	stories.preBrush = function(extent) {

		stories.svg.node.style({'display': 'block'});

		stories.svg.x.scale.domain(extent);

		stories.svg.node
			.selectAll('line')
			.attr("x1", function(d) { return getClusterCoords(d.stories).cx; })
			.attr("y1", function(d) { return getClusterCoords(d.stories).cy; })
			.attr("x2", function(d) { return getClusterCoords(d.stories).cx; })
			.attr("y2", function(d) { return getClusterCoords(d.stories).cyO; });

		stories.svg.node
			.selectAll(".story")
			.attr("cx", function(d) { return getClusterCoords(d.stories).cx; })
			.attr("cy", function(d) { return getClusterCoords(d.stories).cy; });

	};

	stories.brush = function(extent) {

		stories.svg.node.style({'display': 'block'});

		stories.svg.x.scale.domain(extent);

		var clusters = clusterize(stories.data);

		stories.svg.node
			.selectAll('line')
			.data(clusters)
			.attr("x1", function(d) { return d.cx; })
			.attr("y1", function(d) { return d.cy; })
			.attr("x2", function(d) { return d.cx; })
			.attr("y2", function(d) { return d.cyO; });

		stories.svg.node
			.selectAll(".story")
			.data(clusters)
			.attr("class", function(d) {
				var c = 'story';
				if(d.stories.length > 1) {
					c += ' cluster';
				}
				return c;
			})
			.attr("cx", function(d) { return d.cx; })
			.attr("cy", function(d) { return d.cy; });

	};

	stories.updateData = function(data) {

		stories.svg.y.value = function(d) {
			var volumeData = _.find(data, function(p) {
				return d.date.unix() == p.date.getTime() / 1000;
			});

			if(volumeData) {
				return volumeData.volume;
			} else {
				return -1000;
			}
		};

		var clusters = clusterize(stories.data);

		stories.svg.node
			.selectAll('line')
			.data(clusters)
			.transition()
			.duration(2000)
			.attr("y1", function(d) { return d.cy; })
			.attr("y2", function(d) { return d.cyO; });

		stories.svg.node
			.selectAll(".story")
			.data(clusters)
			.transition()
			.duration(2000)
			.attr("cy", function(d) { return d.cy; });

	};

	function clusterize(data) {

		var sorted = _.sortBy(data, function(d) { return -stories.svg.x.scale(stories.svg.x.value(d)); });

		var groups = [];

		var prevVal;
		var i = 0;
		_.each(sorted, function(d) {
			d._cx = stories.svg.x.scale(stories.svg.x.value(d));
			d._cy = stories.svg.y.scale(stories.svg.y.value(d)) * 0.9;
			d._cyO = stories.svg.y.scale(stories.svg.y.value(d));
			if(prevVal - d._cx <= 10) {

				if(!groups[i].length) {
					groups[i] = [];
				}

				groups[i].push(d);
			} else {
				i++;
				groups[i] = [d];
			}
			prevVal = d._cx;
		});

		groups = _.compact(groups);

		var clusters = [];

		_.each(groups, function(group) {

			clusters.push(_.extend({
				titulo: group.length + ' artigos',
				stories: group
			}, getClusterCoords(group)));

		});

		return clusters;

	}

	function getClusterCoords(group) {

		_.each(group, function(story) {
			story._cx = stories.svg.x.scale(stories.svg.x.value(story));
			story._cy = stories.svg.y.scale(stories.svg.y.value(story)) * 0.9;
			story._cyO = stories.svg.y.scale(stories.svg.y.value(story));
		});

		var cx = _.map(group, function(c) { return c._cx; }).reduce(function(prev, cur) { return prev + cur; }) / group.length;
		var cy = _.map(group, function(c) { return c._cy; }).reduce(function(prev, cur) { return prev + cur; }) / group.length;
		var cyO = _.map(group, function(c) { return c._cyO; }).reduce(function(prev, cur) { return prev + cur; }) / group.length;

		return {
			cx: cx,
			cy: cy,
			cyO: cyO
		};
	}

	return stories;

};