/* v95: name-checked POIs, OSM reference coordinates (NOT trail-connected). */
window.SANBAK_SEORAK_V95_POIS={
  "version": 95,
  "park": "seorak",
  "source_snapshot": "2026-11-08",
  "purpose": "Display-only name-confirmed OSM POI locations. Never snap to paths or enable routing.",
  "location_note": "Coordinates are rounded OSM feature points/representative building position via Mapcarta, not official surveyed trail nodes. Name/type corroborated by KNPS pages. Current access and facility operations require checking KNPS notices.",
  "map_line_count_unchanged": 700,
  "render_as_route_vertices": false,
  "allow_nearest_snap": false,
  "features": [
    {
      "id": "seorak-daecheongbong",
      "name": "대청봉",
      "kind": "summit",
      "lonlat": [
        128.46531,
        38.11917
      ],
      "osm_id": "5739515162",
      "osm_type": "node",
      "osm_tag": "natural=peak",
      "coordinate_source": "https://mapcarta.com/27522674",
      "naming_source": "https://www.knps.or.kr/front/portal/visit/visitCourseMain.do?menuNo=7020093&parkId=120400",
      "coordinate_precision": "rounded_5_decimals_not_survey",
      "route_anchor_verified": false,
      "official_trail_access_verified": false,
      "display_allowed": true,
      "status_note": "정상 위치 참고 · 탐방 가능 여부는 공단 통제정보 확인"
    },
    {
      "id": "seorak-socheongbong",
      "name": "소청봉",
      "kind": "summit",
      "lonlat": [
        128.45667,
        38.1249
      ],
      "osm_id": "444209863",
      "osm_type": "node",
      "osm_tag": "natural=peak",
      "coordinate_source": "https://mapcarta.com/27522678",
      "naming_source": "https://www.knps.or.kr/front/portal/visit/visitCourseMain.do?menuNo=7020093&parkId=120400",
      "coordinate_precision": "rounded_5_decimals_not_survey",
      "route_anchor_verified": false,
      "official_trail_access_verified": false,
      "display_allowed": true,
      "status_note": "정상 위치 참고 · 탐방 가능 여부는 공단 통제정보 확인"
    },
    {
      "id": "seorak-socheong-shelter",
      "name": "소청대피소",
      "kind": "shelter",
      "lonlat": [
        128.45356,
        38.12672
      ],
      "osm_id": "444209531",
      "osm_type": "node",
      "osm_tag": "tourism=alpine_hut",
      "coordinate_source": "https://mapcarta.com/N444209531",
      "naming_source": "https://res.knps.or.kr/community/board/notice/boardDetail.do?seq=29036",
      "coordinate_precision": "rounded_5_decimals_not_survey",
      "route_anchor_verified": false,
      "official_trail_access_verified": false,
      "display_allowed": true,
      "status_note": "시설 위치 참고 · 숙박 예약/운영 여부는 공단에서 확인"
    },
    {
      "id": "seorak-jungcheong-shelter",
      "name": "중청대피소",
      "kind": "emergency_shelter",
      "lonlat": [
        128.46039,
        38.12109
      ],
      "osm_id": "469365031",
      "osm_type": "way",
      "osm_tag": "building=yes; amenity=shelter",
      "coordinate_source": "https://mapcarta.com/W469365031",
      "naming_source": "https://res.knps.or.kr/community/board/notice/boardDetail.do?seq=29221",
      "coordinate_precision": "approximate_polygon_representative_point",
      "route_anchor_verified": false,
      "official_trail_access_verified": false,
      "display_allowed": true,
      "status_note": "2026.11.1~2027.2.28 06~15시 임시 비상대피 · 숙박 불가"
    }
  ]
};
