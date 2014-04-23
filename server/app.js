#!/usr/bin/env node

var program = require('commander'),
	_ = require('underscore'),
	csv = require('csv'),
	scrap = require('./scrap');

function formatItems(items) {

	var sep = '======================================\n';

	var output = sep + '\n';

	items.forEach(function(item) {
		for(var key in item) {
			output += key + '\t\t\t\t' + item[key] + '\n';
		}
		output += '\n' + sep + '\n';
	});

	return output;
}

program
	.version('0.0.1')
	.option('-u, --update', 'Scrap data from SABESP and update local database')
	.option('-d, --date [value]', 'Get specific date from database.')
	.option('-m, --manancial [value]', 'Get info on specific date from an especific water system. Date parameter is required')
	.parse(process.argv);

if(program.date) {
	if(typeof(program.date) == 'string') {
		csv().from.path('data/data.csv', {
			columns: true
		}).to.array(function(data) {
			if(program.manancial && typeof(program.manancial) == 'string') {
				console.log('\nBuscando dados em: ' + program.date + ' de ' + program.manancial + '\n');
				console.log(formatItems(_.filter(data, function(d) { return d['data'] == program.date && d['manancial'] == program.manancial; })));
			} else {
				console.log('\nBuscando dados em: ' + program.date + '\n');
				console.log(formatItems(_.filter(data, function(d) { return d['data'] == program.date; })));
			}
		});
	}
}

if(program.update) {

	console.log('Scrapping data');
	scrap();

}