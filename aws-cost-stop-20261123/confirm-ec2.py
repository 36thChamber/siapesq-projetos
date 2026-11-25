import boto3,concurrent.futures as ft,json,collections
regs=[x['RegionName'] for x in boto3.client('ec2',region_name='us-east-1').describe_regions()['Regions']]
def check(region):
 c=boto3.Session().client('ec2',region_name=region)
 states=[i['State']['Name'] for pg in c.get_paginator('describe_instances').paginate() for v in pg['Reservations'] for i in v['Instances']]
 return region,states
with ft.ThreadPoolExecutor(8) as e: results=dict(e.map(check,regs))
print(len(results),collections.Counter(x for v in results.values() for x in v))
