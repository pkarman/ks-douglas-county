json:
	bin/build-json

csv:
	bin/precinct-stats-to-csv

people:
	csv2json doco-democratic-committeepeople.csv > people.json

polling:
	csv2json polling-places.csv > polling.json

deploy-json:
	scp douglas-county-voters-stats.json statedemocrats.us:/data/statedemocrats.us/kansas/douglas/

deploy-csv:
	scp douglas-county-voters-stats.csv statedemocrats.us:/data/statedemocrats.us/kansas/douglas/

deploy:
	ssh statedemocrats.us 'cd /data/statedemocrats.us/kansas/douglas/ && git pull'

districts:
	ruby bin/build-precinct-districts > precinct-with-districts.csv

ward-table:
	ruby bin/ward-list-maker > wards.html
