import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const workspaceSlug = "frc-land-group";
const workspaceName = "FRC Land Group";

function classifyShape(points) {
  if (points.length <= 3) return "triangular";
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const aspect = Math.max(height, 1) / Math.max(width, 1);
  if (aspect > 1.9) return "deep_narrow";
  if (aspect < 0.58) return "wide_shallow";
  return points.length >= 5 ? "irregular" : "rectangular";
}

function buildParcelIntelligence(parcel) {
  const shape = classifyShape(parcel.geometry.points);
  const constraintCoveragePercent = Math.min(55, parcel.constraints.length * 7 + Math.max(0, ((parcel.acreage - parcel.buildable_acres) / Math.max(parcel.acreage, 0.1)) * 100));
  const access = parcel.frontage_ft > 260 ? "external_frontage" : parcel.frontage_ft > 160 ? "corner_access" : parcel.frontage_ft > 110 ? "internal_road_required" : "limited_access";
  const bestStrategy = shape === "rectangular" ? "grid" : access === "internal_road_required" ? "access_corridor" : parcel.frontage_ft > 160 ? "frontage_split" : "manual_review";
  return {
    gross_area_sqft: Math.round(parcel.acreage * 43560),
    gross_area_acres: parcel.acreage,
    buildable_area_sqft: Math.round(parcel.buildable_acres * 43560),
    buildable_area_acres: parcel.buildable_acres,
    frontage_ft: parcel.frontage_ft,
    avg_depth_ft: Math.round((parcel.frontage_ft * 0.62) * 10) / 10,
    max_depth_ft: Math.round((parcel.frontage_ft * 0.9) * 10) / 10,
    min_depth_ft: Math.round((parcel.frontage_ft * 0.38) * 10) / 10,
    compactness_score: shape === "rectangular" ? 84 : shape === "irregular" ? 61 : 56,
    irregularity_score: shape === "rectangular" ? 16 : shape === "irregular" ? 39 : 44,
    constraint_coverage_percent: Math.round(constraintCoveragePercent * 10) / 10,
    shape_classification: shape,
    access_classification: access,
    best_subdivision_strategy: bestStrategy,
    buildability_score: Math.max(18, Math.min(92, Math.round(78 + (parcel.buildable_acres / Math.max(parcel.acreage, 0.1)) * 14 - constraintCoveragePercent * 0.28))),
    warnings: [
      ...(constraintCoveragePercent > 18 ? ["Constraint coverage is high enough to shape yield and lot count."] : []),
      ...(shape === "irregular" ? ["Irregular parcel geometry suggests a frontage-aware layout."] : []),
      ...(access === "internal_road_required" ? ["Internal access will likely be required for a full subdivision concept."] : []),
    ],
    metrics: {
      usableAreaPercent: Math.round((parcel.buildable_acres / Math.max(parcel.acreage, 0.1)) * 1000) / 10,
      frontageEdgeCount: parcel.geometry.points.length,
    },
    recommendations: {
      recommendedStrategy: bestStrategy,
      recommendedLotWidthFt: bestStrategy === "frontage_split" ? 55 : bestStrategy === "access_corridor" ? 48 : 50,
      recommendedLotDepthFt: shape === "deep_narrow" ? 125 : 105,
      recommendedNextActions: ["Run yield analysis", "Generate subdivision", "Open site planner"],
    },
  };
}

function buildFrontageEdges(parcel) {
  return parcel.geometry.points.map((point, index, points) => {
    const next = points[(index + 1) % points.length];
    const length = Math.hypot(next.x - point.x, next.y - point.y) * (parcel.frontage_ft / Math.max(25, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)));
    return {
      edge_index: index,
      line_geometry: { points: [point, next] },
      length_ft: Math.round(length * 10) / 10,
      edge_role: index === 0 ? "frontage" : "candidate",
      touches_public_row: index === 0,
      is_selected: index === 0,
      metadata: {},
    };
  });
}

const users = [
  { email: "optimacycorp@gmail.com", password: "Test1234$", name: "Optimacy Admin" },
  { email: "kalaykhan@gmail.com", password: "Test1234$", name: "Kalay Khan" },
];

const sampleProjects = [
  {
    key: "grinde",
    name: "1122 Grinde Dr",
    description: "Parcel-first concept study with survey control, lot yield, and early planning layouts.",
    location: "Colorado Springs, CO",
    status: "active",
    point_count: 41,
    color: "linear-gradient(135deg, #d6d1c7, #efe7d5 60%, #b7cee8)",
    map: {
      system: "NAD83(2011) / Colorado Central (ftUS)",
      map_label: "Parcel-first map",
      anchor_lng: -104.8167,
      anchor_lat: 38.9604,
      anchor_zoom: 16.2,
    },
    points: [
      { id: "p1", name: "corner", code: "CP", northing: 86, easting: 58, elevation: 5513.9, collected_at: "2026-02-22T17:49:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p2", name: "trench center1", code: "P", northing: 81, easting: 64, elevation: 5513.5, collected_at: "2026-02-22T17:49:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p3", name: "trench center2", code: "P", northing: 78, easting: 66, elevation: 5513.2, collected_at: "2026-02-22T17:49:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p4", name: "trench center3", code: "P", northing: 73, easting: 68, elevation: 5512.8, collected_at: "2026-02-22T17:49:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p5", name: "trench center4", code: "P", northing: 68, easting: 70, elevation: 5512.4, collected_at: "2026-02-22T17:49:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p6", name: "trench center5", code: "P", northing: 62, easting: 72, elevation: 5511.9, collected_at: "2026-02-22T17:48:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p7", name: "trench center6", code: "P", northing: 56, easting: 74, elevation: 5511.4, collected_at: "2026-02-22T17:48:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p8", name: "trench center7", code: "P", northing: 50, easting: 76, elevation: 5510.9, collected_at: "2026-02-22T17:48:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p9", name: "trench center8", code: "P", northing: 44, easting: 78, elevation: 5510.3, collected_at: "2026-02-22T17:48:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p10", name: "trench center9", code: "P", northing: 38, easting: 80, elevation: 5509.7, collected_at: "2026-02-22T17:48:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p11", name: "trench center10", code: "P", northing: 32, easting: 82, elevation: 5509.1, collected_at: "2026-02-22T17:48:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p12", name: "power2", code: "P", northing: 29, easting: 96, elevation: 5508.8, collected_at: "2026-02-22T17:45:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p13", name: "trench center11", code: "P", northing: 23, easting: 84, elevation: 5508.5, collected_at: "2026-02-22T17:48:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p14", name: "hydrant3", code: "P", northing: 20, easting: 96, elevation: 5508.1, collected_at: "2026-02-22T17:45:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" },
      { id: "p15", name: "corner2", code: "CP", northing: 10, easting: 69, elevation: 5506.8, collected_at: "2026-02-22T17:47:00Z", collector: "Thomas C", solution: "FIX", rms: "0.041 sft" }
    ],
    segments: [
      { id: "s1", from_point_id: "p1", to_point_id: "p2", label: "easement" },
      { id: "s2", from_point_id: "p2", to_point_id: "p3", label: "trench" },
      { id: "s3", from_point_id: "p3", to_point_id: "p4", label: "trench" },
      { id: "s4", from_point_id: "p4", to_point_id: "p5", label: "trench" },
      { id: "s5", from_point_id: "p5", to_point_id: "p6", label: "trench" },
      { id: "s6", from_point_id: "p6", to_point_id: "p7", label: "trench" },
      { id: "s7", from_point_id: "p7", to_point_id: "p8", label: "trench" },
      { id: "s8", from_point_id: "p8", to_point_id: "p9", label: "trench" },
      { id: "s9", from_point_id: "p9", to_point_id: "p10", label: "trench" },
      { id: "s10", from_point_id: "p10", to_point_id: "p11", label: "trench" },
      { id: "s11", from_point_id: "p11", to_point_id: "p13", label: "tie" },
      { id: "s12", from_point_id: "p13", to_point_id: "p12", label: "power" }
    ],
    parcels: [
      {
        key: "parcel-a",
        name: "Parcel A",
        source: "county-import",
        apn: "53011-12-345",
        address: "1122 Grinde Dr",
        jurisdiction: "Colorado Springs",
        zoning: "R-2",
        acreage: 4.82,
        buildable_acres: 3.94,
        frontage_ft: 312,
        flood_zone: "X",
        raw_attributes: { lotCoverage: 42, maxUnits: 18 },
        geometry: { points: [{ x: 18, y: 20 }, { x: 53, y: 14 }, { x: 62, y: 39 }, { x: 36, y: 58 }, { x: 15, y: 46 }] },
        constraints: [
          { constraint_type: "flood", label: "Drainage swale", geometry: { points: [{ x: 12, y: 49 }, { x: 33, y: 42 }, { x: 44, y: 45 }, { x: 28, y: 54 }] }, attributes: { severity: "moderate" } },
          { constraint_type: "setback", label: "Utility setback", geometry: { points: [{ x: 17, y: 21 }, { x: 52, y: 16 }, { x: 56, y: 23 }, { x: 19, y: 27 }] }, attributes: { widthFt: 20 } }
        ]
      },
      {
        key: "parcel-b",
        name: "Parcel B",
        source: "county-import",
        apn: "53011-12-346",
        address: "1126 Grinde Dr",
        jurisdiction: "Colorado Springs",
        zoning: "R-1",
        acreage: 3.17,
        buildable_acres: 2.41,
        frontage_ft: 228,
        flood_zone: "AE fringe",
        raw_attributes: { lotCoverage: 36, maxUnits: 9 },
        geometry: { points: [{ x: 58, y: 22 }, { x: 82, y: 17 }, { x: 89, y: 43 }, { x: 68, y: 59 }, { x: 55, y: 46 }] },
        constraints: [
          { constraint_type: "row", label: "Road widening corridor", geometry: { points: [{ x: 56, y: 43 }, { x: 83, y: 38 }, { x: 84, y: 43 }, { x: 57, y: 48 }] }, attributes: { widthFt: 15 } }
        ]
      },
      {
        key: "parcel-c",
        name: "Parcel C",
        source: "concept",
        apn: "53011-12-347",
        address: "1130 Grinde Dr",
        jurisdiction: "Colorado Springs",
        zoning: "MU-N",
        acreage: 2.11,
        buildable_acres: 1.76,
        frontage_ft: 188,
        flood_zone: "X",
        raw_attributes: { lotCoverage: 58, maxUnits: 22 },
        geometry: { points: [{ x: 29, y: 60 }, { x: 56, y: 56 }, { x: 61, y: 82 }, { x: 34, y: 88 }, { x: 22, y: 74 }] },
        constraints: [
          { constraint_type: "easement", label: "Drainage easement", geometry: { points: [{ x: 28, y: 68 }, { x: 58, y: 64 }, { x: 57, y: 69 }, { x: 30, y: 73 }] }, attributes: { widthFt: 12 } }
        ]
      }
    ],
    scenarios: [
      { name: "Low density lots", status: "baseline", assumptions: { product: "Single-family", density: 2.3, openSpacePercent: 18, averageLot: 12500 }, results: { units: 11, averageLot: 12500, openSpacePercent: 18, buildableArea: 171626 } },
      { name: "Townhome cluster", status: "most efficient", assumptions: { product: "Townhomes", density: 5.4, openSpacePercent: 24, averageLot: 3200 }, results: { units: 26, averageLot: 3200, openSpacePercent: 24, buildableArea: 171626 } },
      { name: "Mixed frontage", status: "balanced", assumptions: { product: "Cottage court", density: 3.6, openSpacePercent: 29, averageLot: 4800 }, results: { units: 18, averageLot: 4800, openSpacePercent: 29, buildableArea: 171626 } }
    ],
    documents: [
      { title: "Yield summary package", document_type: "yield-report", status: "ready", metadata: { owner: "Optimacy Admin", updatedAt: "18 Mar 2026", format: "PDF" } },
      { title: "Subdivision concept brief", document_type: "subdivision-summary", status: "draft", metadata: { owner: "Optimacy Admin", updatedAt: "18 Mar 2026", format: "PDF" } },
      { title: "Site plan export", document_type: "site-plan", status: "queued", metadata: { owner: "Optimacy Admin", updatedAt: "18 Mar 2026", format: "PDF" } }
    ],
    ruleset: {
      name: "Colorado Springs starter lots",
      jurisdiction: "Colorado Springs",
      rules: { minLotAreaSqft: 7200, minFrontageFt: 55, minDepthFt: 110, roadWidthFt: 28, setbackFt: 12 }
    },
    savedLayout: {
      name: "Starter grid concept",
      status: "draft",
      metrics: { lotCount: 11, averageLotAreaSqft: 7425, yieldUnits: 11, warnings: [] },
      layout_data: {
        lots: [
          { id: "lot-1", label: "1", polygon: [{ x: 20, y: 20 }, { x: 28, y: 20 }, { x: 28, y: 33 }, { x: 20, y: 33 }] },
          { id: "lot-2", label: "2", polygon: [{ x: 28, y: 20 }, { x: 36, y: 20 }, { x: 36, y: 33 }, { x: 28, y: 33 }] },
          { id: "lot-3", label: "3", polygon: [{ x: 36, y: 20 }, { x: 44, y: 20 }, { x: 44, y: 33 }, { x: 36, y: 33 }] },
          { id: "lot-4", label: "4", polygon: [{ x: 20, y: 33 }, { x: 28, y: 33 }, { x: 28, y: 46 }, { x: 20, y: 46 }] }
        ]
      }
    },
    sitePlan: {
      name: "Starter site plan",
      status: "draft",
      planner_settings: { showTrees: true, showUtilities: true, showEasements: true, showBuildings: true },
      metrics: { buildingCount: 2, treeCount: 6, utilityCount: 3 },
      elements: [
        { element_type: "building", label: "Building A", geometry: { points: [{ x: 26, y: 26 }, { x: 37, y: 26 }, { x: 37, y: 36 }, { x: 26, y: 36 }] }, style: { fill: "#ddd6c8" }, attributes: { areaSqft: 4100 } },
        { element_type: "building", label: "Building B", geometry: { points: [{ x: 40, y: 40 }, { x: 52, y: 40 }, { x: 52, y: 49 }, { x: 40, y: 49 }] }, style: { fill: "#d8d1c2" }, attributes: { areaSqft: 3600 } },
        { element_type: "tree", label: "Tree grove", geometry: { points: [{ x: 58, y: 26 }, { x: 61, y: 30 }, { x: 64, y: 25 }, { x: 66, y: 33 }] }, style: { color: "#2f7a4f" }, attributes: { count: 6 } },
        { element_type: "utility", label: "Water main", geometry: { points: [{ x: 18, y: 58 }, { x: 62, y: 58 }] }, style: { color: "#3475b9" }, attributes: { type: "water" } },
        { element_type: "easement", label: "Drainage easement", geometry: { points: [{ x: 24, y: 65 }, { x: 56, y: 61 }, { x: 58, y: 68 }, { x: 27, y: 72 }] }, style: { hatch: "diagonal" }, attributes: { widthFt: 12 } },
        { element_type: "row", label: "Road corridor", geometry: { points: [{ x: 16, y: 18 }, { x: 62, y: 14 }, { x: 64, y: 19 }, { x: 18, y: 23 }] }, style: { dashed: true }, attributes: { widthFt: 28 } }
      ]
    }
  },
  {
    key: "centennial",
    name: "Colorado Springs - Centennial",
    description: "Parcel diligence setup and early entitlement feasibility review.",
    location: "Colorado Springs, CO",
    status: "draft",
    point_count: 3,
    color: "linear-gradient(135deg, #efefef, #dedede 55%, #f8f8f8)",
    map: {
      system: "NAD83(2011) / Colorado Central (ftUS)",
      map_label: "Parcel base map",
      anchor_lng: -104.7912,
      anchor_lat: 38.8614,
      anchor_zoom: 15.8,
    },
    points: [
      { id: "c1", name: "control north", code: "CP", northing: 78, easting: 44, elevation: 6031.3, collected_at: "2026-02-11T16:12:00Z", collector: "Thomas C", solution: "FIX", rms: "0.038 sft" },
      { id: "c2", name: "control south", code: "CP", northing: 24, easting: 50, elevation: 6028.7, collected_at: "2026-02-11T16:31:00Z", collector: "Thomas C", solution: "FIX", rms: "0.039 sft" },
      { id: "c3", name: "field verify 1", code: "P", northing: 58, easting: 64, elevation: 6030.1, collected_at: "2026-02-11T16:45:00Z", collector: "Thomas C", solution: "FIX", rms: "0.040 sft" }
    ],
    segments: [
      { id: "cs1", from_point_id: "c1", to_point_id: "c3", label: "control line" },
      { id: "cs2", from_point_id: "c3", to_point_id: "c2", label: "control line" }
    ],
    parcels: [
      {
        key: "parcel-main",
        name: "Centennial parcel",
        source: "county-import",
        apn: "64000-45-118",
        address: "Centennial Blvd",
        jurisdiction: "Colorado Springs",
        zoning: "PUD",
        acreage: 6.45,
        buildable_acres: 4.98,
        frontage_ft: 402,
        flood_zone: "X",
        raw_attributes: { lotCoverage: 35, maxUnits: 32 },
        geometry: { points: [{ x: 18, y: 18 }, { x: 78, y: 18 }, { x: 86, y: 56 }, { x: 54, y: 82 }, { x: 22, y: 76 }] },
        constraints: [
          { constraint_type: "drainage", label: "Drainage swale", geometry: { points: [{ x: 20, y: 54 }, { x: 81, y: 48 }, { x: 80, y: 57 }, { x: 24, y: 63 }] }, attributes: { widthFt: 18 } }
        ]
      }
    ],
    scenarios: [
      { name: "Acquisition baseline", status: "draft", assumptions: { product: "Detached", density: 4.1, openSpacePercent: 22, averageLot: 6200 }, results: { units: 20, averageLot: 6200, openSpacePercent: 22, buildableArea: 216929 } }
    ],
    documents: [
      { title: "Parcel diligence summary", document_type: "parcel-summary", status: "draft", metadata: { owner: "Optimacy Admin", updatedAt: "18 Mar 2026", format: "PDF" } }
    ],
    ruleset: {
      name: "Centennial PUD concept",
      jurisdiction: "Colorado Springs",
      rules: { minLotAreaSqft: 6000, minFrontageFt: 50, minDepthFt: 100, roadWidthFt: 30, setbackFt: 15 }
    },
    savedLayout: {
      name: "Entitlement concept A",
      status: "draft",
      metrics: { lotCount: 20, averageLotAreaSqft: 6480, yieldUnits: 20, warnings: ["Drainage swale reduces the center block depth."] },
      layout_data: {
        lots: [
          { id: "cent-lot-1", label: "1", polygon: [{ x: 24, y: 22 }, { x: 33, y: 22 }, { x: 33, y: 34 }, { x: 24, y: 34 }] },
          { id: "cent-lot-2", label: "2", polygon: [{ x: 33, y: 22 }, { x: 42, y: 22 }, { x: 42, y: 34 }, { x: 33, y: 34 }] }
        ]
      }
    },
    sitePlan: {
      name: "Centennial concept plan",
      status: "draft",
      planner_settings: { showTrees: true, showUtilities: true, showEasements: true, showBuildings: true },
      metrics: { buildingCount: 3, treeCount: 10, utilityCount: 2 },
      elements: [
        { element_type: "building", label: "Townhome Block A", geometry: { points: [{ x: 30, y: 28 }, { x: 44, y: 28 }, { x: 44, y: 37 }, { x: 30, y: 37 }] }, style: { fill: "#ddd3bf" }, attributes: { areaSqft: 5200 } },
        { element_type: "building", label: "Townhome Block B", geometry: { points: [{ x: 48, y: 42 }, { x: 62, y: 42 }, { x: 62, y: 51 }, { x: 48, y: 51 }] }, style: { fill: "#d9ceb8" }, attributes: { areaSqft: 5100 } },
        { element_type: "tree", label: "Open space trees", geometry: { points: [{ x: 68, y: 30 }, { x: 72, y: 35 }, { x: 75, y: 29 }, { x: 77, y: 38 }] }, style: { color: "#2f7a4f" }, attributes: { count: 10 } },
        { element_type: "utility", label: "Storm line", geometry: { points: [{ x: 24, y: 60 }, { x: 76, y: 60 }] }, style: { color: "#3475b9" }, attributes: { type: "storm" } },
        { element_type: "easement", label: "Drainage setback", geometry: { points: [{ x: 20, y: 54 }, { x: 81, y: 48 }, { x: 80, y: 57 }, { x: 24, y: 63 }] }, style: { hatch: "diagonal" }, attributes: { widthFt: 18 } },
        { element_type: "row", label: "Entry drive", geometry: { points: [{ x: 18, y: 18 }, { x: 40, y: 18 }, { x: 40, y: 24 }, { x: 18, y: 24 }] }, style: { dashed: true }, attributes: { widthFt: 30 } }
      ]
    }
  }
];

async function ensureWorkspace() {
  const { data: existing, error: selectError } = await supabase.from("workspaces").select("id").eq("slug", workspaceSlug).maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;
  const { data, error } = await supabase.from("workspaces").insert({ name: workspaceName, slug: workspaceSlug }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function ensureUser(workspaceId, user) {
  const list = await supabase.auth.admin.listUsers();
  const existing = list.data.users.find((entry) => entry.email?.toLowerCase() === user.email.toLowerCase());
  const authUser = existing
    ? existing
    : (await supabase.auth.admin.createUser({ email: user.email, password: user.password, email_confirm: true, user_metadata: { name: user.name } })).data.user;
  if (!authUser) throw new Error(`Failed to provision auth user for ${user.email}`);

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authUser.id,
    email: user.email,
    full_name: user.name,
    workspace_id: workspaceId,
    role: "admin",
  });
  if (profileError) throw profileError;

  const { error: membershipError } = await supabase.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: authUser.id,
    role: "admin",
  });
  if (membershipError) throw membershipError;

  return authUser.id;
}

async function ensureProject(workspaceId, ownerId, project) {
  const { data: existing, error: existingError } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", project.name)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        description: project.description,
        location: project.location,
        status: project.status,
        point_count: project.point_count,
        color: project.color,
      })
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      owner_id: ownerId,
      name: project.name,
      description: project.description,
      location: project.location,
      status: project.status,
      point_count: project.point_count,
      color: project.color,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error(`Unable to create ${project.name}`);
  return data.id;
}

async function seedWorkspaceData(projectId, project, workspaceId, ownerId) {
  const { error: settingsError } = await supabase.from("project_map_settings").upsert({ project_id: projectId, ...project.map });
  if (settingsError) throw settingsError;

  await supabase.from("survey_segments").delete().eq("project_id", projectId);
  await supabase.from("survey_points").delete().eq("project_id", projectId);

  const { error: pointsError } = await supabase.from("survey_points").insert(project.points.map((point) => ({ ...point, project_id: projectId })));
  if (pointsError) throw pointsError;

  const { error: segmentsError } = await supabase.from("survey_segments").insert(project.segments.map((segment) => ({ ...segment, project_id: projectId })));
  if (segmentsError) throw segmentsError;

  const { data: existingParcels } = await supabase.from("parcel_snapshots").select("id").eq("project_id", projectId);
  const parcelIds = (existingParcels ?? []).map((entry) => entry.id);
  if (parcelIds.length) {
    await supabase.from("parcel_frontage_edges").delete().in("parcel_snapshot_id", parcelIds);
    await supabase.from("parcel_intelligence_records").delete().in("parcel_snapshot_id", parcelIds);
    await supabase.from("parcel_constraints").delete().in("parcel_snapshot_id", parcelIds);
    await supabase.from("parcel_geometries").delete().in("parcel_snapshot_id", parcelIds);
  }
  await supabase.from("parcel_snapshots").delete().eq("project_id", projectId);
  await supabase.from("yield_scenarios").delete().eq("project_id", projectId);
  const { data: existingSitePlans } = await supabase.from("site_plan_layouts").select("id").eq("project_id", projectId);
  const sitePlanIds = (existingSitePlans ?? []).map((entry) => entry.id);
  if (sitePlanIds.length) {
    await supabase.from("site_plan_elements").delete().in("site_plan_layout_id", sitePlanIds);
  }
  await supabase.from("site_plan_layouts").delete().eq("project_id", projectId);
  await supabase.from("subdivision_layouts").delete().eq("project_id", projectId);
  await supabase.from("subdivision_rulesets").delete().eq("project_id", projectId);
  await supabase.from("project_documents").delete().eq("project_id", projectId);

  const insertedParcels = [];
  for (const parcel of project.parcels) {
    const { data: snapshot, error: snapshotError } = await supabase
      .from("parcel_snapshots")
      .insert({
        project_id: projectId,
        name: parcel.name,
        source: parcel.source,
        apn: parcel.apn,
        address: parcel.address,
        jurisdiction: parcel.jurisdiction,
        zoning: parcel.zoning,
        acreage: parcel.acreage,
        buildable_acres: parcel.buildable_acres,
        frontage_ft: parcel.frontage_ft,
        flood_zone: parcel.flood_zone,
        raw_attributes: parcel.raw_attributes,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (snapshotError || !snapshot) throw snapshotError ?? new Error(`Unable to insert parcel ${parcel.name}`);

    insertedParcels.push({ key: parcel.key, id: snapshot.id, name: parcel.name, acreage: parcel.acreage });

    const { error: geometryError } = await supabase.from("parcel_geometries").insert({
      parcel_snapshot_id: snapshot.id,
      geometry_role: "raw_boundary",
      geometry: parcel.geometry,
      geometry_type: "polygon",
      area_sqft: parcel.acreage * 43560,
      perimeter_ft: parcel.frontage_ft * 2.4,
      bbox: {},
    });
    if (geometryError) throw geometryError;

    if (parcel.constraints.length) {
      const { error: constraintsError } = await supabase.from("parcel_constraints").insert(
        parcel.constraints.map((constraint) => ({
          parcel_snapshot_id: snapshot.id,
          constraint_type: constraint.constraint_type,
          label: constraint.label,
          geometry: constraint.geometry,
          attributes: constraint.attributes,
        })),
      );
      if (constraintsError) throw constraintsError;
    }

    const intelligence = buildParcelIntelligence(parcel);
    const { error: intelligenceError } = await supabase.from("parcel_intelligence_records").insert({
      parcel_snapshot_id: snapshot.id,
      ...intelligence,
    });
    if (intelligenceError) throw intelligenceError;

    const { error: frontageError } = await supabase.from("parcel_frontage_edges").insert(
      buildFrontageEdges(parcel).map((edge) => ({
        parcel_snapshot_id: snapshot.id,
        ...edge,
      })),
    );
    if (frontageError) throw frontageError;
  }

  const primaryParcelId = insertedParcels[0]?.id ?? null;

  const { data: ruleset, error: rulesetError } = await supabase
    .from("subdivision_rulesets")
    .insert({
      project_id: projectId,
      workspace_id: workspaceId,
      name: project.ruleset.name,
      jurisdiction: project.ruleset.jurisdiction,
      rules: project.ruleset.rules,
      created_by: ownerId,
    })
    .select("id")
    .single();
  if (rulesetError || !ruleset) throw rulesetError ?? new Error(`Unable to create ruleset for ${project.name}`);

  if (project.scenarios.length) {
    const { error: scenariosError } = await supabase.from("yield_scenarios").insert(
      project.scenarios.map((scenario) => ({
        project_id: projectId,
        selected_parcel_snapshot_id: primaryParcelId,
        name: scenario.name,
        status: scenario.status,
        assumptions: scenario.assumptions,
        results: scenario.results,
        created_by: ownerId,
      })),
    );
    if (scenariosError) throw scenariosError;
  }

  const { error: layoutError } = await supabase.from("subdivision_layouts").insert({
    project_id: projectId,
    parcel_snapshot_id: primaryParcelId,
    ruleset_id: ruleset.id,
    name: project.savedLayout.name,
    status: project.savedLayout.status,
    metrics: project.savedLayout.metrics,
    layout_data: project.savedLayout.layout_data,
    created_by: ownerId,
  });
  if (layoutError) throw layoutError;

  if (project.documents.length) {
    const { error: documentError } = await supabase.from("project_documents").insert(
      project.documents.map((document) => ({
        project_id: projectId,
        document_type: document.document_type,
        title: document.title,
        status: document.status,
        metadata: document.metadata,
        created_by: ownerId,
      })),
    );
    if (documentError) throw documentError;
  }

  if (project.sitePlan) {
    const { data: sitePlan, error: sitePlanError } = await supabase
      .from("site_plan_layouts")
      .insert({
        project_id: projectId,
        parcel_snapshot_id: primaryParcelId,
        name: project.sitePlan.name,
        status: project.sitePlan.status,
        planner_settings: project.sitePlan.planner_settings,
        metrics: project.sitePlan.metrics,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (sitePlanError || !sitePlan) throw sitePlanError ?? new Error(`Unable to create site plan for ${project.name}`);

    if (project.sitePlan.elements.length) {
      const { error: sitePlanElementsError } = await supabase.from("site_plan_elements").insert(
        project.sitePlan.elements.map((element, index) => ({
          site_plan_layout_id: sitePlan.id,
          element_type: element.element_type,
          label: element.label,
          geometry: element.geometry,
          style: element.style,
          attributes: element.attributes,
          z_index: index,
        })),
      );
      if (sitePlanElementsError) throw sitePlanElementsError;
    }
  }
}

async function run() {
  const workspaceId = await ensureWorkspace();
  const userIds = [];
  for (const user of users) userIds.push(await ensureUser(workspaceId, user));
  for (const project of sampleProjects) {
    const projectId = await ensureProject(workspaceId, userIds[0], project);
    await seedWorkspaceData(projectId, project, workspaceId, userIds[0]);
  }
  console.log("Supabase sprint-3 parcel intelligence seed complete");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
