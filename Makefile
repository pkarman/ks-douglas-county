json:
	bin/build-json

people:
	csv2json doco-democratic-committeepeople.csv > people.json

polling:
	csv2json polling-places.csv > polling.json

deploy-json:
	scp -P 10022 douglas-county-voters-stats.json statedemocrats.us:/data/statedemocrats.us/kansas/douglas/

deploy:
	ssh -p 10022 statedemocrats.us 'cd /data/statedemocrats.us/kansas/douglas/ && git pull'
