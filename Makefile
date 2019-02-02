csv:
	bin/precinct-stats-to-csv

people:
	csv2json doco-democratic-committeepeople.csv > people.json
	ruby bin/precinct-to-people

polling:
	csv2json polling-places.csv > polling.json

deploy-json:
	scp douglas-county-voters-stats.json statedemocrats.us:/data/statedemocrats.us/kansas/douglas/
	scp precinct-to-people.json statedemocrats.us:/data/statedemocrats.us/kansas/douglas/

deploy-csv:
	scp douglas-county-voters-stats.csv statedemocrats.us:/data/statedemocrats.us/kansas/douglas/

deploy:
	ssh statedemocrats.us 'cd /data/statedemocrats.us/kansas/douglas/ && git pull'

districts:
	ruby bin/build-precinct-districts > precinct-with-districts.csv

ward-table:
	ruby bin/ward-list-maker > wards.html

turnout:
	ruby bin/turnout-by-pcp

json: people polling

.PHONY: csv people polling deploy-json deploy-csv deploy districts ward-table json
