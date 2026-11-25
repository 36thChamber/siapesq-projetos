#!/bin/bash
#Script to run the acolite application and upload the results to the S3 bucket, run in crontab
DIR="$HOME/copel_aws/acolite_application"
cd $DIR
source venv/bin/activate
python acolite.py >> $HOME/logs_acolite.log 2>&1
aws s3 cp out s3://example-bucket --recursive >> $HOME/logs_aws.log 2>&1
deactivate
rm -rfd "out"
mkdir "out"
touch "out/.gitkeep"
cd -
