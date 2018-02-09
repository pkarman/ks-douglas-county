json:
	bin/build-json

people:
	csv2json doco-democratic-committeepeople.csv > people.json

polling:
	csv2json polling-places.csv > polling.json

deploy:
	ssh -p 10022 statedemocrats.us 'cd /data/statedemocrats.us/kansas/douglas/ && git pull'
