#!/usr/bin/env python3
"""v88: extract 125 held Seoraksan OSM roads, exterior-only, for official GIS comparison.
Never routes, displays, modifies, or joins source OSM geometries.
Requirements: pip install shapely pyproj
"""
import argparse
import json
from pathlib import Path
from shapely.geometry import LineString, shape
from shapely.ops import transform
from pyproj import Transformer

def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--osm-lines', required=True, help='User-owned 2026-11-05 original OSM way WGS84 GeoJSON')
    cli.add_argument('--park-boundary', required=True, help='Original OSM relation 17335482 WGS84 park boundary JSON list')
    cli.add_argument('--v83-audit', default='audits/seorak-v83-grade1-track-gpx-review.json')
    cli.add_argument('--output', required=True)
    args = cli.parse_args()

    review = json.loads(Path(args.v83_audit).read_text(encoding='utf-8'))
    held = list(review['remaining_held_way_ids'])
    if len(held) != 125 or len(set(held)) != 125:
        raise ValueError('Expected 125 distinct held v83 OSM way IDs')

    original = json.loads(Path(args.osm_lines).read_text(encoding='utf-8'))
    if original.get('type') != 'FeatureCollection':
        raise ValueError('Original OSM way file must be a GeoJSON FeatureCollection')
    ways = {str(f['properties']['osm_id']): f for f in original['features']}
    if any(str(n) not in ways for n in held):
        raise ValueError('An original 2026 OSM source way is missing')

    parks = json.loads(Path(args.park_boundary).read_text(encoding='utf-8'))
    matches = [f['geometry'] for f in parks
               if str(f.get('properties', {}).get('osm_id')) == '17335482']
    if len(matches) != 1:
        raise ValueError('Expected exactly one original OSM boundary relation 17335482')
    to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32652', always_xy=True).transform
    to_wgs = Transformer.from_crs('EPSG:32652', 'EPSG:4326', always_xy=True).transform
    park = transform(to_utm, shape(matches[0]))
    # Clipping can interpolate boundary intersection vertices; this NEVER creates connecting paths.
    exterior = park.buffer(1500, quad_segs=8).difference(park)

    def component_lines(geometry):
        if geometry.geom_type == 'LineString':
            return [geometry]
        if hasattr(geometry, 'geoms'):
            return [line for item in geometry.geoms for line in component_lines(item)]
        return []

    features = []
    for osm_id in held:
        source = ways[str(osm_id)]
        if source['geometry']['type'] != 'LineString' or source['properties'].get('highway') != 'track':
            raise ValueError(f'Unexpected original OSM track type for {osm_id}')
        line = transform(to_utm, LineString(source['geometry']['coordinates']))
        pieces = sorted((g for g in component_lines(line.intersection(exterior)) if g.length >= .2),
                        key=lambda g: -g.length)
        if not pieces:
            raise ValueError(f'No exterior line left for held OSM way {osm_id}')
        for part_id, part in enumerate(pieces, start=1):
            coords = [[round(lon, 8), round(lat, 8)] for lon, lat in transform(to_wgs, part).coords]
            features.append({
                'type': 'Feature',
                'properties': {
                    'osm_way_id': osm_id, 'exterior_part': part_id,
                    'highway': 'track',
                    'source': 'Geofabrik South Korea OSM PBF 2026-11-05',
                    'exterior_length_m': round(part.length, 2),
                    'route_allowed': False, 'field_verified': False, 'display_in_map': False,
                    'source_geometry_note': 'OSM clipped outside relation 17335482 to 1500m; clipping creates interpolated endpoints but no route joins'
                },
                'geometry': {'type': 'LineString', 'coordinates': coords}
            })
    result = {
        'type': 'FeatureCollection',
        'name': 'Sanbakmap v88 audit-only 125 held grade1/paved OSM ways - Seoraksan exterior',
        'source': 'Geofabrik South Korea OSM PBF 2026-11-05',
        'source_osm_boundary_relation': '17335482', 'exterior_buffer_m': 1500,
        'coordinate_reference_system': 'WGS84 EPSG:4326 longitude latitude',
        'way_count': len(held), 'part_count': len(features),
        'route_allowed': False, 'field_verified': False, 'display_in_map': False,
        'warning': 'Not official KFS Imdo GIS; use only for comparing against independently acquired official centerline data.',
        'features': features
    }
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n',
                                 encoding='utf-8')
    print(json.dumps({
        'ways': len(held), 'parts': len(features),
        'total_length_m': round(sum(f['properties']['exterior_length_m'] for f in features), 2),
        'file': args.output
    }, ensure_ascii=False))

if __name__ == '__main__':
    main()
