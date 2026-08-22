import { isSupportedSport } from '../../modules/catalog/catalog.constants.js';
import {
  validateProductCreateInput,
  validateProductDiscountState,
} from '../../modules/catalog/product.validation.js';
import { SeedValidationError } from './seed.utils.js';

const SPORT_BRANDS = Object.freeze({
  football: Object.freeze(['FieldCraft', 'MatchWorks']),
  cricket: Object.freeze(['WillowLine', 'CreaseWorks']),
  basketball: Object.freeze(['CourtLab', 'ElevateSport']),
  tennis: Object.freeze(['RallyWorks', 'CourtLine']),
  badminton: Object.freeze(['AeroCourt', 'ShuttleWorks']),
  running: Object.freeze(['TempoActive', 'StrideLab']),
  fitness: Object.freeze(['CoreForm', 'MotionLab']),
});

const FIXED_DISCOUNTS = Object.freeze({
  football: 30000,
  cricket: 20000,
  basketball: 50000,
  tennis: 10000,
  badminton: 20000,
  running: 10000,
  fitness: 10000,
});

function detail(
  basePrice,
  description,
  material,
  recommendedUse,
  featureName,
  featureValue,
  variantOptions = null,
) {
  return Object.freeze({
    basePrice,
    description,
    specifications: Object.freeze({
      material,
      recommendedUse,
      [featureName]: featureValue,
      warrantyMonths: 6,
    }),
    variantOptions,
  });
}

const sizes = (values) =>
  Object.freeze(values.map((value) => Object.freeze({ Size: value })));
const colors = (values) =>
  Object.freeze(values.map((value) => Object.freeze({ Color: value })));
const singleOption = (name, values) =>
  Object.freeze(
    values.map((value) => Object.freeze({ [name]: value })),
  );

export const PRODUCT_DETAILS = Object.freeze({
  'product:football:matchcore-training-football': detail(
    129900,
    'A durable training football with a textured cover for dependable touch during drills and casual matches.',
    'PU composite',
    'Training and recreational play',
    'size',
    '5',
  ),
  'product:football:stride-control-boots': detail(
    399900,
    'Supportive football boots pair a synthetic upper with molded studs for firm-ground training and match play.',
    'Synthetic upper and rubber sole',
    'Firm-ground football',
    'closure',
    'Lace-up',
    sizes(['7', '8', '9', '10']),
  ),
  'product:football:pivot-agility-cones': detail(
    69900,
    'Flexible marker cones help organize footwork, speed, and change-of-direction drills on indoor or outdoor surfaces.',
    'Flexible polyethylene',
    'Agility training',
    'pieces',
    12,
  ),
  'product:football:goalguard-training-net': detail(
    349900,
    'A portable training net provides a practical target for shooting sessions and small-sided practice.',
    'Polyester net and steel frame',
    'Shooting practice',
    'widthCm',
    180,
  ),
  'product:football:touchline-shin-guards': detail(
    119900,
    'Contoured shin guards combine a protective shell and cushioned backing for comfortable training coverage.',
    'Polypropylene shell and EVA foam',
    'Football protection',
    'fit',
    'Anatomical',
    sizes(['S', 'M', 'L', 'XL']),
  ),
  'product:football:fieldmark-disc-set': detail(
    59900,
    'Low-profile training discs mark boundaries and drill stations without interrupting running patterns.',
    'Flexible polyethylene',
    'Field marking',
    'pieces',
    20,
    colors(['Orange', 'Yellow', 'Blue', 'Red']),
  ),

  'product:cricket:willowcraft-english-bat': detail(
    899900,
    'A balanced willow cricket bat offers a responsive face and comfortable handle for club practice and matches.',
    'English willow and cane handle',
    'Leather-ball cricket',
    'bladeProfile',
    'Mid sweet spot',
    singleOption('Weight', ['1150g', '1200g', '1250g', '1300g']),
  ),
  'product:cricket:paceline-training-ball-set': detail(
    89900,
    'A set of resilient training balls supports repeat bowling, catching, and fielding sessions.',
    'Synthetic leather and cork blend',
    'Cricket training',
    'pieces',
    6,
  ),
  'product:cricket:guardflex-batting-pads': detail(
    349900,
    'Layered batting pads provide lightweight leg coverage with adjustable straps for a stable fit.',
    'High-density foam and synthetic facing',
    'Batting protection',
    'side',
    'Ambidextrous',
    sizes(['S', 'M', 'L', 'XL']),
  ),
  'product:cricket:creasekeeper-wicket-gloves': detail(
    269900,
    'Padded wicketkeeping gloves use a grippy palm and flexible cuffs for confident takes behind the stumps.',
    'Synthetic leather and rubber grip',
    'Wicketkeeping',
    'closure',
    'Hook-and-loop',
    sizes(['S', 'M', 'L', 'XL']),
  ),
  'product:cricket:stumpstead-practice-wickets': detail(
    159900,
    'Stable practice wickets assemble quickly for nets, garden sessions, and portable training setups.',
    'Impact-resistant polymer',
    'Practice cricket',
    'stumpCount',
    3,
  ),
  'product:cricket:innings-carry-kit-bag': detail(
    249900,
    'A spacious cricket kit bag organizes a bat, protective equipment, footwear, and smaller accessories.',
    'Water-resistant polyester',
    'Cricket equipment transport',
    'capacityLitres',
    75,
  ),

  'product:basketball:courtarc-indoor-basketball': detail(
    149900,
    'A tacky composite basketball provides controlled handling and consistent bounce on indoor courts.',
    'Composite leather',
    'Indoor basketball',
    'size',
    '7',
  ),
  'product:basketball:elevate-court-shoes': detail(
    449900,
    'Cushioned basketball shoes combine lateral support and a patterned rubber outsole for quick court movement.',
    'Mesh and synthetic overlays',
    'Indoor court play',
    'closure',
    'Lace-up',
    sizes(['7', '8', '9', '10']),
  ),
  'product:basketball:rebound-marker-set': detail(
    69900,
    'Bright floor markers define shooting, passing, and movement stations while lying flat during drills.',
    'Non-slip thermoplastic rubber',
    'Court training',
    'pieces',
    10,
  ),
  'product:basketball:rimrise-portable-hoop': detail(
    699900,
    'A portable practice hoop offers an adjustable target for shooting work in compact training spaces.',
    'Steel rim and polycarbonate board',
    'Recreational shooting practice',
    'rimDiameterCm',
    38,
  ),
  'product:basketball:driveguard-knee-sleeves': detail(
    99900,
    'Stretch knee sleeves provide light compression and warmth without restricting court movement.',
    'Nylon elastane knit',
    'Court support',
    'compression',
    'Medium',
    sizes(['S', 'M', 'L', 'XL']),
  ),
  'product:basketball:fastbreak-training-bib': detail(
    79900,
    'A breathable training bib makes teams easy to identify during scrimmages and skill sessions.',
    'Ventilated polyester mesh',
    'Team training',
    'fit',
    'Relaxed',
    sizes(['S', 'M', 'L', 'XL']),
  ),

  'product:tennis:rallypoint-control-racquet': detail(
    599900,
    'A balanced tennis racquet blends a forgiving head with controlled response for developing and intermediate players.',
    'Graphite composite',
    'All-court tennis',
    'headSizeSqIn',
    100,
    singleOption('Grip Size', ['G1', 'G2', 'G3', 'G4']),
  ),
  'product:tennis:baseline-training-ball-tube': detail(
    59900,
    'Pressurized training balls deliver a consistent bounce for coaching, practice sets, and recreational play.',
    'Rubber core and woven felt',
    'Tennis practice',
    'ballCount',
    4,
  ),
  'product:tennis:courtcarry-racquet-bag': detail(
    249900,
    'A padded racquet bag carries two frames and essentials with separate accessory storage.',
    'Water-resistant polyester',
    'Tennis equipment transport',
    'racquetCapacity',
    2,
  ),
  'product:tennis:netline-wristband-set': detail(
    29900,
    'Soft absorbent wristbands help manage moisture while maintaining a comfortable stretch fit.',
    'Cotton elastane knit',
    'Racquet sport training',
    'pieces',
    2,
    colors(['Navy', 'White', 'Black', 'Orange']),
  ),
  'product:tennis:servespot-target-cones': detail(
    49900,
    'Compact target cones create clear serving and placement zones without damaging the court surface.',
    'Flexible polyethylene',
    'Serve placement drills',
    'pieces',
    8,
  ),
  'product:tennis:spinpath-overgrip-pack': detail(
    44900,
    'Tacky overgrips add cushioning and moisture control for a secure racquet handle.',
    'Polyurethane',
    'Tennis racquet grip replacement',
    'gripCount',
    3,
    colors(['Black', 'White', 'Blue', 'Orange']),
  ),

  'product:badminton:aerostrike-control-racquet': detail(
    399900,
    'A streamlined badminton racquet balances maneuverability and stability for controlled rallies and attacking play.',
    'Carbon composite',
    'Indoor badminton',
    'balance',
    'Even',
    Object.freeze([
      Object.freeze({ Weight: '4U', Grip: 'G5' }),
      Object.freeze({ Weight: '4U', Grip: 'G6' }),
      Object.freeze({ Weight: '3U', Grip: 'G5' }),
      Object.freeze({ Weight: '3U', Grip: 'G6' }),
    ]),
  ),
  'product:badminton:featherflight-shuttle-tube': detail(
    89900,
    'Consistent feather shuttles provide a stable flight path for club drills and match practice.',
    'Natural feather and cork',
    'Indoor badminton',
    'shuttleCount',
    12,
  ),
  'product:badminton:swiftcourt-indoor-shoes': detail(
    379900,
    'Low-profile badminton shoes pair breathable support with a non-marking sole for quick indoor direction changes.',
    'Mesh upper and gum rubber sole',
    'Indoor court play',
    'closure',
    'Lace-up',
    sizes(['7', '8', '9', '10']),
  ),
  'product:badminton:netglide-racquet-bag': detail(
    219900,
    'A structured badminton bag protects racquets and keeps shuttles, shoes, and accessories organized.',
    'Padded polyester',
    'Badminton equipment transport',
    'racquetCapacity',
    3,
  ),
  'product:badminton:cleardrop-training-net': detail(
    249900,
    'A portable badminton net sets up for technique sessions, warm-ups, and recreational games.',
    'Nylon mesh and steel poles',
    'Portable badminton practice',
    'widthCm',
    300,
  ),
  'product:badminton:gripwing-overgrip-pack': detail(
    39900,
    'Slim badminton overgrips improve handle traction while preserving quick racquet feedback.',
    'Polyurethane',
    'Badminton racquet grip replacement',
    'gripCount',
    3,
    colors(['Black', 'White', 'Teal', 'Orange']),
  ),

  'product:running:temporun-daily-trainers': detail(
    499900,
    'Daily running trainers use responsive cushioning and a durable outsole for steady road mileage.',
    'Engineered mesh and rubber',
    'Road running',
    'dropMm',
    8,
    sizes(['7', '8', '9', '10']),
  ),
  'product:running:endurance-breathable-tee': detail(
    129900,
    'A lightweight running tee moves moisture away from the skin and uses flat seams for comfortable training.',
    'Recycled polyester',
    'Running and cardio',
    'fit',
    'Regular',
    sizes(['S', 'M', 'L', 'XL']),
  ),
  'product:running:paceband-running-belt': detail(
    89900,
    'A low-bounce running belt keeps a phone, keys, and small essentials secure during daily miles.',
    'Stretch nylon',
    'Road and treadmill running',
    'pocketCount',
    2,
  ),
  'product:running:strideflow-shorts': detail(
    149900,
    'Flexible running shorts combine quick-dry fabric, a secure waistband, and practical pocket storage.',
    'Polyester elastane',
    'Running and training',
    'inseamInches',
    7,
    sizes(['S', 'M', 'L', 'XL']),
  ),
  'product:running:nightpath-safety-vest': detail(
    79900,
    'A lightweight safety vest adds high-visibility panels and reflective trim for lower-light running.',
    'Fluorescent polyester mesh',
    'Low-light running',
    'reflective',
    true,
  ),
  'product:running:recoverstep-calf-sleeves': detail(
    99900,
    'Graduated calf sleeves provide supportive compression with breathable zones for training and recovery.',
    'Nylon elastane knit',
    'Running support and recovery',
    'compression',
    'Graduated',
  ),

  'product:fitness:corelift-cast-kettlebell': detail(
    189900,
    'A cast kettlebell with a powder-coated handle supports swings, carries, presses, and strength circuits.',
    'Powder-coated cast iron',
    'Strength training',
    'base',
    'Flat',
    singleOption('Weight', ['8 kg', '12 kg', '16 kg', '20 kg']),
  ),
  'product:fitness:balanceflow-yoga-mat': detail(
    149900,
    'A textured yoga mat provides stable cushioning and grip for floor poses, mobility work, and stretching.',
    'TPE foam',
    'Yoga and mobility',
    'lengthCm',
    183,
    singleOption('Thickness', ['4 mm', '6 mm', '8 mm', '10 mm']),
  ),
  'product:fitness:restore-grid-foam-roller': detail(
    129900,
    'A firm grid roller combines varied surface zones for controlled self-massage and post-training mobility.',
    'EVA foam and rigid core',
    'Recovery and mobility',
    'lengthCm',
    33,
  ),
  'product:fitness:powerloop-resistance-band-set': detail(
    129900,
    'Loop resistance bands provide progressive tension for warm-ups, strength exercises, and mobility sessions.',
    'Natural latex',
    'Strength and mobility training',
    'bandCount',
    4,
    singleOption('Resistance', ['Light', 'Medium', 'Heavy', 'Extra Heavy']),
  ),
  'product:fitness:motionbase-step-platform': detail(
    349900,
    'An adjustable step platform uses a textured deck and stable risers for cardio and lower-body workouts.',
    'Reinforced polypropylene',
    'Step aerobics and conditioning',
    'maximumLoadKg',
    120,
  ),
  'product:fitness:steadygrip-push-up-bars': detail(
    119900,
    'Stable push-up bars provide padded handles and non-slip feet for varied upper-body positions.',
    'Steel and foam',
    'Bodyweight strength training',
    'pieces',
    2,
  ),
});

function numberedKey(namespace, index) {
  return `${namespace}:${String(index + 1).padStart(2, '0')}`;
}

function discountFor(sport, sportIndex) {
  if (sportIndex === 1) {
    return { discountType: 'percentage', discountValue: 10 };
  }

  if (sportIndex === 3) {
    return {
      discountType: 'fixed',
      discountValue: FIXED_DISCOUNTS[sport],
    };
  }

  if (sportIndex === 4) {
    return { discountType: 'percentage', discountValue: 15 };
  }

  return { discountType: null, discountValue: null };
}

export function normalizedVariantKey(options) {
  return JSON.stringify(
    Object.entries(options)
      .map(([name, value]) => [
        name.trim().replace(/\s+/g, ' ').toLowerCase(),
        value.trim().replace(/\s+/g, ' ').toLowerCase(),
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function buildProductDefinitions({ manifest, registry, categories }) {
  const categoryByKey = new Map(
    categories.map((category) => [category.categoryKey, category]),
  );
  const sportIndexes = new Map();

  return manifest.products.map((manifestProduct) => {
    const details = PRODUCT_DETAILS[manifestProduct.seedKey];
    const sportIndex = sportIndexes.get(manifestProduct.sport) || 0;
    sportIndexes.set(manifestProduct.sport, sportIndex + 1);
    const category = categoryByKey.get(manifestProduct.categoryKey);
    const variantOptions = details?.variantOptions || [];
    const discount = discountFor(manifestProduct.sport, sportIndex);

    return {
      _id: registry.idFor(manifestProduct.seedKey),
      seedKey: manifestProduct.seedKey,
      slug: manifestProduct.slug,
      name: manifestProduct.name,
      sport: manifestProduct.sport,
      categoryKey: manifestProduct.categoryKey,
      categoryId: category?._id,
      productType: manifestProduct.productType,
      brand: SPORT_BRANDS[manifestProduct.sport]?.[sportIndex < 3 ? 0 : 1],
      description: details?.description,
      basePrice: details?.basePrice,
      ...discount,
      specifications: details?.specifications,
      isActive: manifestProduct.active,
      variants: variantOptions.map((options, index) => ({
        _id: registry.idFor(
          numberedKey(`variant:${manifestProduct.seedKey}`, index),
        ),
        options,
        isActive: index < 3,
      })),
      images: manifestProduct.images.map((image, index) => ({
        _id: registry.idFor(
          numberedKey(`product-image:${manifestProduct.seedKey}`, index),
        ),
        file: image.file,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      })),
    };
  });
}

function assert(condition, code, message) {
  if (!condition) {
    throw new SeedValidationError(code, message);
  }
}

export function validateProductDefinitions({ manifest, registry, categories }) {
  const definitions = buildProductDefinitions({
    manifest,
    registry,
    categories,
  });
  const manifestByKey = new Map(
    manifest.products.map((product) => [product.seedKey, product]),
  );
  const categoryByKey = new Map(
    categories.map((category) => [category.categoryKey, category]),
  );
  const detailKeys = Object.keys(PRODUCT_DETAILS);
  const productIds = new Set();
  const variantIds = new Set();
  const imageIds = new Set();
  const imageFiles = new Set();

  assert(
    definitions.length === 42 && manifestByKey.size === 42,
    'DEMO_PRODUCT_COUNT_INVALID',
    'Product definitions and manifest must both contain exactly 42 records.',
  );
  assert(
    detailKeys.length === 42 &&
      detailKeys.every((key) => manifestByKey.has(key)),
    'DEMO_PRODUCT_DETAILS_COVERAGE_INVALID',
    'Product details must map one-to-one with the locked manifest.',
  );

  for (const definition of definitions) {
    const source = manifestByKey.get(definition.seedKey);
    const category = categoryByKey.get(definition.categoryKey);
    const specificationValues = Object.values(definition.specifications || {});
    const normalizedVariantKeys = definition.variants.map((variant) =>
      normalizedVariantKey(variant.options),
    );

    assert(
      source &&
        definition.name === source.name &&
        definition.slug === source.slug &&
        definition.sport === source.sport &&
        definition.categoryKey === source.categoryKey &&
        definition.productType === source.productType &&
        definition.isActive === source.active,
      'DEMO_PRODUCT_MANIFEST_IDENTITY_MISMATCH',
      `Product ${definition.seedKey} differs from its locked manifest identity.`,
    );
    assert(
      isSupportedSport(definition.sport),
      'DEMO_PRODUCT_SPORT_INVALID',
      `Product ${definition.seedKey} uses an unsupported sport.`,
    );
    assert(
      category &&
        category.sport === definition.sport &&
        (!definition.isActive || category.isActive),
      'DEMO_PRODUCT_CATEGORY_INVALID',
      `Product ${definition.seedKey} has an invalid Category relationship.`,
    );
    assert(
      Number.isInteger(definition.basePrice) && definition.basePrice > 0,
      'DEMO_PRODUCT_PRICE_INVALID',
      `Product ${definition.seedKey} has an invalid base price.`,
    );

    validateProductDiscountState(definition);

    assert(
      specificationValues.length >= 3 &&
        specificationValues.length <= 6 &&
        specificationValues.every((value) =>
          ['string', 'number', 'boolean'].includes(typeof value),
        ),
      'DEMO_PRODUCT_SPECIFICATIONS_INVALID',
      `Product ${definition.seedKey} has invalid specifications.`,
    );

    if (definition.productType === 'variant') {
      assert(
        definition.variants.length === 4 &&
          definition.variants.filter((variant) => variant.isActive).length ===
            3 &&
          new Set(normalizedVariantKeys).size === 4,
        'DEMO_PRODUCT_VARIANTS_INVALID',
        `Variant Product ${definition.seedKey} must have four unique variants with 3/1 activity.`,
      );
    } else {
      assert(
        definition.variants.length === 0,
        'DEMO_PRODUCT_SIMPLE_VARIANTS_INVALID',
        `Simple Product ${definition.seedKey} cannot have variants.`,
      );
    }

    validateProductCreateInput({
      name: definition.name,
      description: definition.description,
      brand: definition.brand,
      sport: definition.sport,
      categoryId: definition.categoryId.toString(),
      basePrice: definition.basePrice,
      discountType: definition.discountType,
      discountValue: definition.discountValue,
      specifications: definition.specifications,
      ...(definition.productType === 'variant'
        ? {
            variants: definition.variants.map((variant) => ({
              options: variant.options,
              initialQuantity: 0,
              isActive: variant.isActive,
            })),
          }
        : { initialQuantity: 0 }),
      isActive: definition.isActive,
    });

    assert(
      definition.images.length === 2 &&
        definition.images.filter((image) => image.isPrimary).length === 1 &&
        definition.images.every(
          (image, index) =>
            image.file === source.images[index].file &&
            image.altText === source.images[index].altText &&
            image.isPrimary === source.images[index].isPrimary &&
            image.sortOrder === source.images[index].sortOrder &&
            !Object.hasOwn(image, 'publicId') &&
            !Object.hasOwn(image, 'url'),
        ),
      'DEMO_PRODUCT_IMAGE_BLUEPRINT_INVALID',
      `Product ${definition.seedKey} has invalid image blueprints.`,
    );

    productIds.add(definition._id.toString());
    definition.variants.forEach((variant) =>
      variantIds.add(variant._id.toString()),
    );
    definition.images.forEach((image) => {
      imageIds.add(image._id.toString());
      imageFiles.add(image.file);
    });
  }

  const sportCounts = Object.fromEntries(
    Object.keys(SPORT_BRANDS).map((sport) => [
      sport,
      definitions.filter((product) => product.sport === sport).length,
    ]),
  );
  const categoryCounts = Object.fromEntries(
    categories.map((category) => [
      category.categoryKey,
      definitions.filter(
        (product) => product.categoryKey === category.categoryKey,
      ).length,
    ]),
  );
  const brandCounts = Object.fromEntries(
    Object.keys(SPORT_BRANDS).map((sport) => [
      sport,
      Object.fromEntries(
        SPORT_BRANDS[sport].map((brand) => [
          brand,
          definitions.filter(
            (product) => product.sport === sport && product.brand === brand,
          ).length,
        ]),
      ),
    ]),
  );

  assert(
    Object.values(sportCounts).every((count) => count === 6) &&
      definitions.filter((product) => product.productType === 'simple')
        .length === 21 &&
      definitions.filter((product) => product.productType === 'variant')
        .length === 21 &&
      definitions.filter((product) => product.isActive).length === 38,
    'DEMO_PRODUCT_CATALOG_TOTALS_INVALID',
    'Product definition catalog totals do not match the locked manifest.',
  );
  assert(
    productIds.size === 42 &&
      variantIds.size === 84 &&
      imageIds.size === 84 &&
      imageFiles.size === 84,
    'DEMO_PRODUCT_DETERMINISTIC_IDS_INVALID',
    'Product, Variant, or Product-image deterministic IDs are invalid.',
  );
  assert(
    Object.values(brandCounts).every(
      (counts) =>
        Object.keys(counts).length === 2 &&
        Object.values(counts).every((count) => count === 3),
    ),
    'DEMO_PRODUCT_BRAND_COVERAGE_INVALID',
    'Each sport must use exactly two fictional brands with three Products each.',
  );

  return {
    definitions,
    sportCounts,
    categoryCounts,
    brandCounts,
    counts: {
      products: definitions.length,
      simple: definitions.filter(
        (product) => product.productType === 'simple',
      ).length,
      variant: definitions.filter(
        (product) => product.productType === 'variant',
      ).length,
      active: definitions.filter((product) => product.isActive).length,
      inactive: definitions.filter((product) => !product.isActive).length,
      variants: variantIds.size,
      images: imageIds.size,
      noDiscount: definitions.filter(
        (product) => product.discountType === null,
      ).length,
      percentageDiscount: definitions.filter(
        (product) => product.discountType === 'percentage',
      ).length,
      fixedDiscount: definitions.filter(
        (product) => product.discountType === 'fixed',
      ).length,
      minimumPrice: Math.min(...definitions.map((product) => product.basePrice)),
      maximumPrice: Math.max(...definitions.map((product) => product.basePrice)),
    },
  };
}
