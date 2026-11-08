#!/usr/bin/env python3
"""Reusable no-shortcut check for source-identical closed 2D/3D loop geometry.
No user-facing map or routing mutations. Full source-level CLI is in v134 ZIP.
"""
import math
from shapely.geometry import LineString
def distance(a,b):
 return math.hypot(a[0]-b[0],a[1]-b[1])

def closed_source_match(original_xy,original_edge_m,source3d_lines,tolerance_m=.3):
 if not isinstance(original_xy,list) or len(original_xy)<3 or distance(original_xy[0],original_xy[-1])>.15:
  return []
 original=LineString(original_xy)
 if abs(original.length-original_edge_m)>max(.4,original_edge_m*.005):
  return []
 hits=[]
 for index,coords in enumerate(source3d_lines):
  if len(coords)!=len(original_xy) or any(len(x)<3 or not math.isfinite(x[2]) for x in coords):
   continue
  elevxy=[(p[0],p[1]) for p in coords]
  if distance(elevxy[0],elevxy[-1])>.15 or abs(coords[0][2]-coords[-1][2])>.5:
   continue
  line=LineString(elevxy)
  if abs(line.length-original.length)>max(.8,original_edge_m*.005) or original.hausdorff_distance(line)>tolerance_m:
   continue
  forward=max(distance(a,b) for a,b in zip(original_xy,elevxy))
  backward=max(distance(a,b) for a,b in zip(original_xy,reversed(elevxy)))
  if min(forward,backward)>tolerance_m:
   continue
  hits.append({'part':index,'direction':'reverse' if backward<forward else 'forward',
    'maxVertexErrorMeters':min(forward,backward),
    'hausdorffMeters':original.hausdorff_distance(line),
    'sourceVerified':True,'physicalPassageVerified':False})
 # A geometry match is usable only when unique. The caller must never choose
 # an ambiguous height from coincident trails.
 return hits if len(hits)==1 else []
