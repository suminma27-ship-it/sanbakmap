#!/usr/bin/env python3
"""v132 original DEM gap provenance audit. No new DEM values, links or UI."""
import argparse,collections,gzip,hashlib,json,zipfile
from pathlib import Path
SHA={'v129':'a672b42904c270c7b8442ae7dd29b64d3efea4ee0a555bd8d60d972222c9b7cb',
'v131':'cd508e38d05eef75d5a641fe5dfd62f592d086602c113ffae81981f99d746e1d',
'v109':'045cd0b4c41114f7a71b711b601445138a3ef9741a8ee4abaa6660f6e49c1e2e'}
def source_edges(record,nodeid):
 g=record['graph']; raw=[i for i,e in enumerate(g['edges'][:record['baseEdges']]) if nodeid in e[:2]]
 derived=[m['sourceEdge'] for m in record['derivedEdges'] if
    m['type']=='original_split_exact' and nodeid in g['edges'][m['id']][:2]]
 return sorted(set(raw+derived))
def run(v129,v131,v109):
 for p,expected in [(v129,SHA['v129']),(v131,SHA['v131']),(v109,SHA['v109'])]:
  with p.open('rb') as f: actual=hashlib.file_digest(f,'sha256').hexdigest()
  if actual!=expected:raise ValueError(f'Mismatched source file {p}')
 missing=[];counter=collections.Counter();nodes_by_mountain=collections.defaultdict(dict)
 with zipfile.ZipFile(v129) as graphs,zipfile.ZipFile(v131) as audit,zipfile.ZipFile(v109) as packed:
  for i in range(32):
   bucket=f'{i:02d}'
   gs=json.loads(gzip.decompress(graphs.read(f'bucket-{bucket}.json.gz')))
   rows=json.loads(gzip.decompress(audit.read(f'bucket-{bucket}.json.gz')))
   dems=json.loads(packed.read(f'data/nationwide-elevation/bucket-{bucket}.json'))
   for code,datum in rows['mountains'].items():
    absent=[a for a in datum['links'] if a['elevationStatus'] in
       {'missing_one_end_height','missing_both_end_heights'}]
    if not absent:continue
    record=gs['mountains'][code]
    dem=dems['mountains'].get(code)
    sampled=set(map(int,dem['samples'])) if dem else set()
    for link in absent:
     endpoints=[]
     for nodeid,previous in zip(link['sourceNodeIds'],(link['endpointA'],link['endpointB'])):
      ids=source_edges(record,nodeid)
      has=bool(sampled.intersection(ids))
      if has!=(previous is not None):raise ValueError(f'v131 DEM endpoint status differs {code}:{nodeid}')
      endpoints.append({'nodeId':nodeid,'originalEdgeIds':ids,'demPresent':has})
      if not has:
       if not ids:raise ValueError('Untraceable missing original source edge')
       old=nodes_by_mountain[code].setdefault(nodeid,ids)
       if old!=ids:raise ValueError('Non-deterministic source node lineage')
     state='missing_mountain_dem' if not dem else 'missing_original_edge_samples'
     counter[state]+=1
     counter[link['elevationStatus']]+=1
     counter['joins_disconnected_components']+=link['sourceRouteImpact']=='joins_separate_source_components'
     counter['cuts_over_2km_detour']+=link['sourceRouteImpact']=='shortcut_over_2km'
     counter['missing_endpoint_occurrences']+=sum(not e['demPresent'] for e in endpoints)
     missing.append({'code':code,'bucket':bucket,'sourceLinkId':link['qaLinkId'],
         'gapMeters':link['distanceMeters'],'sourceIds':link['sourceIds'],
         'routeImpact':link['sourceRouteImpact'],'missingReason':state,
         'endpoints':endpoints,'verifiedPhysicalConnection':False})
 if len(missing)!=118:raise ValueError('118 priority gap records expected')
 targets=[]
 for code,nodes in sorted(nodes_by_mountain.items()):
  left=set(nodes)
  while left:
   covers=collections.defaultdict(set)
   for n in left:
    for edgeid in nodes[n]:covers[edgeid].add(n)
   if not covers:raise ValueError('No sampleable original edge for missing node')
   edge,hit=min(covers.items(),key=lambda e:(-len(e[1]),e[0]))
   targets.append({'mountainCode':code,'originalEdgeId':edge,'missingNodeIds':sorted(hit),
       'needsNewOriginalEdgeDEMSamples':True})
   left-=hit
 if len(targets)!=129:raise ValueError('Unexpected DEM repair target list')
 result={'schema':'sanbak-v132-dem-gap-repair-plan','mountainsPreserved':2902,
   'removedMountainCodes':0,'priorityMissingLinks':len(missing),
   'missingMountainDEM':counter['missing_mountain_dem'],
   'missingOriginalEdgeSamples':counter['missing_original_edge_samples'],
   'distinctMissingNodes':sum(map(len,nodes_by_mountain.values())),
   'missingEndpointOccurrences':counter['missing_endpoint_occurrences'],
   'mountainsAffected':len(nodes_by_mountain),'requestedOriginalEdgeDEMTargets':len(targets),
   'affectedJoinsSeparateComponents':counter['joins_disconnected_components'],
   'affectedOver2kmDetours':counter['cuts_over_2km_detour'],
   'sourceHashes':SHA,'noElevationsInvented':True,'publicRoutesChanged':False}
 return result,missing,targets
if __name__=='__main__':
 cli=argparse.ArgumentParser()
 for name in ['v129','v131','v109-dem']:cli.add_argument('--'+name,type=Path,required=True)
 cli.add_argument('--outdir',type=Path,required=True)
 a=cli.parse_args()
 summary,detail,targets=run(a.v129,a.v131,a.v109_dem)
 a.outdir.mkdir(parents=True,exist_ok=True)
 for path,content in [('summary.json',summary),('missing-links.json',detail),('repair-edges.json',targets)]:
  (a.outdir/path).write_text(json.dumps(content,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('PASS v132',json.dumps(summary,ensure_ascii=False))
