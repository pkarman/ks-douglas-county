json:
	bin/build-json

people:
	csv2json doco-democratic-committeepeople.csv > people.json

polling:
	csv2json polling-places.csv > polling.json
