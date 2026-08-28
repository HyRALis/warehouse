export interface SystemTemplateDefinition {
    key: string;
    name: string;
    fields: { name: string; measurement?: string }[];
}

export interface SystemCategoryDefinition {
    code: string;
    name: string;
    aliases: string[];
    defaultTemplateKey: string;
    children: Omit<SystemCategoryDefinition, 'children'>[];
}

const field = (name: string, measurement?: string) => ({ name, ...(measurement ? { measurement } : {}) });

export const SYSTEM_TEMPLATES: SystemTemplateDefinition[] = [
    { key: 'system.generic-physical-product', name: 'Generic Physical Product', fields: [field('Brand'), field('Model'), field('Material'), field('Country of Origin'), field('Weight', 'kg'), field('Warranty')] },
    { key: 'system.packaged-food', name: 'Packaged Food', fields: [field('Brand'), field('Net Weight', 'g'), field('Ingredients'), field('Allergens'), field('Dietary Claims'), field('Storage Instructions'), field('Shelf Life')] },
    { key: 'system.beverage', name: 'Beverage', fields: [field('Brand'), field('Volume', 'ml'), field('Flavor'), field('Ingredients'), field('Caffeine', 'mg'), field('Alcohol Content', '%'), field('Container Type')] },
    { key: 'system.apparel', name: 'Apparel', fields: [field('Brand'), field('Size'), field('Color'), field('Material'), field('Fit'), field('Care Instructions'), field('Audience')] },
    { key: 'system.footwear', name: 'Footwear', fields: [field('Brand'), field('Size'), field('Color'), field('Upper Material'), field('Sole Material'), field('Fit'), field('Closure')] },
    { key: 'system.beauty-personal-care', name: 'Beauty & Personal Care', fields: [field('Brand'), field('Volume', 'ml'), field('Skin or Hair Type'), field('Ingredients'), field('Scent'), field('Usage'), field('Expiration or PAO')] },
    { key: 'system.consumer-electronics', name: 'Consumer Electronics', fields: [field('Brand'), field('Model'), field('Power', 'W'), field('Connectivity'), field('Dimensions'), field('Weight', 'kg'), field('Warranty')] },
    { key: 'system.computers-technology', name: 'Computers & Technology', fields: [field('Brand'), field('Model'), field('Processor'), field('Memory', 'GB'), field('Storage', 'GB'), field('Connectivity'), field('Operating System'), field('Warranty')] },
    { key: 'system.home-kitchen', name: 'Home & Kitchen', fields: [field('Brand'), field('Material'), field('Dimensions'), field('Capacity'), field('Color'), field('Care Instructions'), field('Warranty')] },
    { key: 'system.handmade-creator-merchandise', name: 'Handmade & Creator Merchandise', fields: [field('Creator or Brand'), field('Material'), field('Dimensions'), field('Color'), field('Edition'), field('Production Method'), field('Care Instructions')] },
    { key: 'system.health-wellness', name: 'Health & Wellness', fields: [field('Brand'), field('Form'), field('Strength'), field('Serving Size'), field('Ingredients'), field('Usage'), field('Warnings')] },
    { key: 'system.pet-product', name: 'Pet Product', fields: [field('Brand'), field('Animal Type'), field('Life Stage'), field('Size'), field('Ingredients or Material'), field('Usage'), field('Storage Instructions')] },
];

const child = (root: string, slug: string, name: string, defaultTemplateKey: string, aliases: string[] = []) => ({
    code: `${root}.${slug}`,
    name,
    aliases,
    defaultTemplateKey,
});

const GENERIC = 'system.generic-physical-product';
const FOOD = 'system.packaged-food';
const BEVERAGE = 'system.beverage';
const APPAREL = 'system.apparel';
const FOOTWEAR = 'system.footwear';
const BEAUTY = 'system.beauty-personal-care';
const ELECTRONICS = 'system.consumer-electronics';
const TECH = 'system.computers-technology';
const HOME = 'system.home-kitchen';
const CREATOR = 'system.handmade-creator-merchandise';
const HEALTH = 'system.health-wellness';
const PET = 'system.pet-product';

export const SYSTEM_CATEGORIES: SystemCategoryDefinition[] = [
    {
        code: 'food-beverage', name: 'Food & Beverage', aliases: ['food', 'drinks', 'grocery'], defaultTemplateKey: FOOD,
        children: [
            child('food-beverage', 'snacks', 'Snacks', FOOD, ['snack food']),
            child('food-beverage', 'confectionery', 'Confectionery', FOOD, ['candy', 'sweets']),
            child('food-beverage', 'bakery', 'Bakery', FOOD, ['baked goods']),
            child('food-beverage', 'pantry-dry-goods', 'Pantry & Dry Goods', FOOD, ['pantry', 'dry goods']),
            child('food-beverage', 'fresh-chilled', 'Fresh & Chilled', FOOD, ['fresh food', 'refrigerated']),
            child('food-beverage', 'frozen-foods', 'Frozen Foods', FOOD, ['frozen']),
            child('food-beverage', 'beverages', 'Beverages', BEVERAGE, ['drinks']),
            child('food-beverage', 'other', 'Other Food & Beverage', GENERIC, ['miscellaneous food']),
        ],
    },
    {
        code: 'clothing-accessories', name: 'Clothing & Accessories', aliases: ['clothing', 'fashion', 'apparel'], defaultTemplateKey: APPAREL,
        children: [
            child('clothing-accessories', 'tops', 'Tops', APPAREL, ['shirts']),
            child('clothing-accessories', 'bottoms', 'Bottoms', APPAREL, ['pants', 'trousers']),
            child('clothing-accessories', 'dresses-one-pieces', 'Dresses & One-Pieces', APPAREL, ['dresses', 'jumpsuits']),
            child('clothing-accessories', 'outerwear', 'Outerwear', APPAREL, ['jackets', 'coats']),
            child('clothing-accessories', 'underwear-sleepwear', 'Underwear & Sleepwear', APPAREL, ['lingerie', 'nightwear']),
            child('clothing-accessories', 'footwear', 'Footwear', FOOTWEAR, ['shoes']),
            child('clothing-accessories', 'bags-accessories', 'Bags & Accessories', APPAREL, ['bags', 'fashion accessories']),
            child('clothing-accessories', 'other', 'Other Clothing', APPAREL, ['miscellaneous clothing']),
        ],
    },
    {
        code: 'beauty-personal-care', name: 'Beauty & Personal Care', aliases: ['beauty', 'cosmetics', 'personal care'], defaultTemplateKey: BEAUTY,
        children: [
            child('beauty-personal-care', 'skincare', 'Skincare', BEAUTY, ['skin care']),
            child('beauty-personal-care', 'hair-care', 'Hair Care', BEAUTY, ['haircare']),
            child('beauty-personal-care', 'makeup', 'Makeup', BEAUTY, ['cosmetics']),
            child('beauty-personal-care', 'fragrance', 'Fragrance', BEAUTY, ['perfume']),
            child('beauty-personal-care', 'bath-body', 'Bath & Body', BEAUTY, ['body care']),
            child('beauty-personal-care', 'nail-care', 'Nail Care', BEAUTY, ['nails']),
            child('beauty-personal-care', 'grooming', 'Grooming', BEAUTY, ['shaving']),
            child('beauty-personal-care', 'other', 'Other Beauty', BEAUTY, ['miscellaneous beauty']),
        ],
    },
    {
        code: 'electronics', name: 'Electronics', aliases: ['devices', 'gadgets'], defaultTemplateKey: ELECTRONICS,
        children: [
            child('electronics', 'phones-tablets', 'Phones & Tablets', ELECTRONICS, ['mobile phones', 'smartphones']),
            child('electronics', 'audio', 'Audio', ELECTRONICS, ['speakers', 'headphones']),
            child('electronics', 'cameras', 'Cameras', ELECTRONICS, ['photography']),
            child('electronics', 'tvs-displays', 'TVs & Displays', ELECTRONICS, ['televisions', 'monitors']),
            child('electronics', 'smart-home', 'Smart Home', ELECTRONICS, ['home automation']),
            child('electronics', 'wearables', 'Wearables', ELECTRONICS, ['smart watches']),
            child('electronics', 'gaming-hardware', 'Gaming Hardware', ELECTRONICS, ['consoles', 'gaming']),
            child('electronics', 'other', 'Other Electronics', ELECTRONICS, ['miscellaneous electronics']),
        ],
    },
    {
        code: 'computers-technology', name: 'Computers & Technology', aliases: ['computers', 'tech', 'it'], defaultTemplateKey: TECH,
        children: [
            child('computers-technology', 'laptops-desktops', 'Laptops & Desktops', TECH, ['computers', 'pcs']),
            child('computers-technology', 'components', 'Components', TECH, ['computer parts']),
            child('computers-technology', 'storage', 'Storage', TECH, ['hard drives', 'ssd']),
            child('computers-technology', 'networking', 'Networking', TECH, ['routers', 'network equipment']),
            child('computers-technology', 'keyboards-mice', 'Keyboards & Mice', TECH, ['input devices']),
            child('computers-technology', 'printers-scanners', 'Printers & Scanners', TECH, ['printing']),
            child('computers-technology', 'cables-adapters', 'Cables & Adapters', TECH, ['connectors']),
            child('computers-technology', 'other', 'Other Technology', TECH, ['miscellaneous technology']),
        ],
    },
    {
        code: 'home-kitchen', name: 'Home & Kitchen', aliases: ['homeware', 'household', 'kitchen'], defaultTemplateKey: HOME,
        children: [
            child('home-kitchen', 'cookware', 'Cookware', HOME, ['pots', 'pans']),
            child('home-kitchen', 'tableware', 'Tableware', HOME, ['dishes', 'cutlery']),
            child('home-kitchen', 'small-appliances', 'Small Appliances', HOME, ['kitchen appliances']),
            child('home-kitchen', 'furniture', 'Furniture', HOME, ['home furniture']),
            child('home-kitchen', 'bedding-bath', 'Bedding & Bath', HOME, ['linens', 'towels']),
            child('home-kitchen', 'home-decor', 'Home Decor', HOME, ['decorations']),
            child('home-kitchen', 'cleaning-supplies', 'Cleaning Supplies', HOME, ['household cleaning']),
            child('home-kitchen', 'other', 'Other Home & Kitchen', HOME, ['miscellaneous homeware']),
        ],
    },
    {
        code: 'arts-crafts-handmade', name: 'Arts, Crafts & Handmade', aliases: ['arts', 'crafts', 'handmade'], defaultTemplateKey: CREATOR,
        children: [
            child('arts-crafts-handmade', 'art-supplies', 'Art Supplies', CREATOR, ['artist materials']),
            child('arts-crafts-handmade', 'craft-supplies', 'Craft Supplies', CREATOR, ['craft materials']),
            child('arts-crafts-handmade', 'sewing-textiles', 'Sewing & Textiles', CREATOR, ['fabric', 'sewing']),
            child('arts-crafts-handmade', 'jewelry', 'Jewelry', CREATOR, ['jewellery']),
            child('arts-crafts-handmade', 'ceramics', 'Ceramics', CREATOR, ['pottery']),
            child('arts-crafts-handmade', 'woodwork', 'Woodwork', CREATOR, ['woodworking']),
            child('arts-crafts-handmade', 'stationery', 'Stationery', CREATOR, ['paper goods']),
            child('arts-crafts-handmade', 'other', 'Other Handmade', CREATOR, ['miscellaneous handmade']),
        ],
    },
    {
        code: 'creator-merchandise', name: 'Creator Merchandise', aliases: ['creator merch', 'influencer products', 'merch'], defaultTemplateKey: CREATOR,
        children: [
            child('creator-merchandise', 'branded-apparel', 'Branded Apparel', APPAREL, ['merch clothing']),
            child('creator-merchandise', 'hats-accessories', 'Hats & Accessories', APPAREL, ['caps']),
            child('creator-merchandise', 'prints-posters', 'Prints & Posters', CREATOR, ['wall art']),
            child('creator-merchandise', 'stickers', 'Stickers', CREATOR, ['decals']),
            child('creator-merchandise', 'mugs-drinkware', 'Mugs & Drinkware', CREATOR, ['cups']),
            child('creator-merchandise', 'books-media', 'Books & Media', CREATOR, ['publications']),
            child('creator-merchandise', 'collectibles', 'Collectibles', CREATOR, ['limited editions']),
            child('creator-merchandise', 'other', 'Other Creator Merchandise', CREATOR, ['miscellaneous merch']),
        ],
    },
    {
        code: 'sports-outdoors', name: 'Sports & Outdoors', aliases: ['sports', 'outdoor', 'fitness'], defaultTemplateKey: GENERIC,
        children: [
            child('sports-outdoors', 'fitness-equipment', 'Fitness Equipment', GENERIC, ['gym equipment']),
            child('sports-outdoors', 'outdoor-recreation', 'Outdoor Recreation', GENERIC, ['outdoor gear']),
            child('sports-outdoors', 'team-sports', 'Team Sports', GENERIC, ['sports equipment']),
            child('sports-outdoors', 'cycling', 'Cycling', GENERIC, ['bikes', 'bicycles']),
            child('sports-outdoors', 'running', 'Running', FOOTWEAR, ['jogging']),
            child('sports-outdoors', 'camping-hiking', 'Camping & Hiking', GENERIC, ['camping gear']),
            child('sports-outdoors', 'sportswear', 'Sportswear', APPAREL, ['activewear']),
            child('sports-outdoors', 'other', 'Other Sports', GENERIC, ['miscellaneous sports']),
        ],
    },
    {
        code: 'health-wellness', name: 'Health & Wellness', aliases: ['health', 'wellness'], defaultTemplateKey: HEALTH,
        children: [
            child('health-wellness', 'vitamins-supplements', 'Vitamins & Supplements', HEALTH, ['supplements']),
            child('health-wellness', 'first-aid', 'First Aid', HEALTH, ['emergency care']),
            child('health-wellness', 'medical-devices', 'Medical Devices', HEALTH, ['health devices']),
            child('health-wellness', 'oral-care', 'Oral Care', HEALTH, ['dental care']),
            child('health-wellness', 'personal-hygiene', 'Personal Hygiene', HEALTH, ['hygiene']),
            child('health-wellness', 'mobility-accessibility', 'Mobility & Accessibility', HEALTH, ['mobility aids']),
            child('health-wellness', 'wellness-products', 'Wellness Products', HEALTH, ['self care']),
            child('health-wellness', 'other', 'Other Health', HEALTH, ['miscellaneous health']),
        ],
    },
    {
        code: 'baby-kids-toys', name: 'Baby, Kids & Toys', aliases: ['baby', 'kids', 'toys'], defaultTemplateKey: GENERIC,
        children: [
            child('baby-kids-toys', 'baby-care', 'Baby Care', BEAUTY, ['infant care']),
            child('baby-kids-toys', 'feeding', 'Feeding', GENERIC, ['baby feeding']),
            child('baby-kids-toys', 'kids-clothing', 'Kids Clothing', APPAREL, ['children clothing']),
            child('baby-kids-toys', 'nursery', 'Nursery', HOME, ['baby room']),
            child('baby-kids-toys', 'educational-toys', 'Educational Toys', GENERIC, ['learning toys']),
            child('baby-kids-toys', 'games-puzzles', 'Games & Puzzles', GENERIC, ['board games']),
            child('baby-kids-toys', 'outdoor-toys', 'Outdoor Toys', GENERIC, ['playground toys']),
            child('baby-kids-toys', 'other', 'Other Kids & Toys', GENERIC, ['miscellaneous toys']),
        ],
    },
    {
        code: 'pet-supplies', name: 'Pet Supplies', aliases: ['pets', 'animal supplies'], defaultTemplateKey: PET,
        children: [
            child('pet-supplies', 'pet-food', 'Pet Food', PET, ['animal food']),
            child('pet-supplies', 'treats', 'Treats', PET, ['pet snacks']),
            child('pet-supplies', 'health-grooming', 'Health & Grooming', PET, ['pet care']),
            child('pet-supplies', 'toys', 'Toys', PET, ['pet toys']),
            child('pet-supplies', 'beds-habitats', 'Beds & Habitats', PET, ['pet beds', 'cages']),
            child('pet-supplies', 'collars-leashes', 'Collars & Leashes', PET, ['pet leads']),
            child('pet-supplies', 'aquatic-supplies', 'Aquatic Supplies', PET, ['aquarium']),
            child('pet-supplies', 'other', 'Other Pet Supplies', PET, ['miscellaneous pet supplies']),
        ],
    },
    {
        code: 'automotive', name: 'Automotive', aliases: ['cars', 'vehicle supplies'], defaultTemplateKey: GENERIC,
        children: [
            child('automotive', 'parts', 'Parts', GENERIC, ['auto parts']),
            child('automotive', 'tools-equipment', 'Tools & Equipment', GENERIC, ['automotive tools']),
            child('automotive', 'car-care', 'Car Care', GENERIC, ['vehicle care']),
            child('automotive', 'oils-fluids', 'Oils & Fluids', GENERIC, ['motor oil']),
            child('automotive', 'vehicle-electronics', 'Vehicle Electronics', ELECTRONICS, ['car electronics']),
            child('automotive', 'interior-accessories', 'Interior Accessories', GENERIC, ['car interior']),
            child('automotive', 'exterior-accessories', 'Exterior Accessories', GENERIC, ['car exterior']),
            child('automotive', 'other', 'Other Automotive', GENERIC, ['miscellaneous automotive']),
        ],
    },
    {
        code: 'office-business-supplies', name: 'Office & Business Supplies', aliases: ['office', 'business supplies', 'commercial supplies'], defaultTemplateKey: GENERIC,
        children: [
            child('office-business-supplies', 'office-supplies', 'Office Supplies', GENERIC, ['desk supplies']),
            child('office-business-supplies', 'paper-packaging', 'Paper & Packaging', GENERIC, ['paper goods']),
            child('office-business-supplies', 'office-furniture', 'Office Furniture', HOME, ['desks', 'office chairs']),
            child('office-business-supplies', 'point-of-sale', 'Point of Sale', ELECTRONICS, ['pos', 'checkout equipment']),
            child('office-business-supplies', 'safety-equipment', 'Safety Equipment', GENERIC, ['ppe']),
            child('office-business-supplies', 'industrial-consumables', 'Industrial Consumables', GENERIC, ['industrial supplies']),
            child('office-business-supplies', 'shipping-supplies', 'Shipping Supplies', GENERIC, ['mailing supplies']),
            child('office-business-supplies', 'other', 'Other Business Supplies', GENERIC, ['miscellaneous business supplies']),
        ],
    },
];

export function validateSystemCatalog(): void {
    if (SYSTEM_TEMPLATES.length !== 12) throw new Error(`Expected 12 system templates, found ${SYSTEM_TEMPLATES.length}`);
    if (SYSTEM_CATEGORIES.length !== 14) throw new Error(`Expected 14 root categories, found ${SYSTEM_CATEGORIES.length}`);
    if (SYSTEM_CATEGORIES.some((root) => root.children.length !== 8)) throw new Error('Every system root must have exactly 8 children');

    const templateKeys = new Set(SYSTEM_TEMPLATES.map((template) => template.key));
    const categories = SYSTEM_CATEGORIES.flatMap((root) => [root, ...root.children]);
    const categoryCodes = new Set(categories.map((category) => category.code));
    if (templateKeys.size !== SYSTEM_TEMPLATES.length) throw new Error('System template keys must be unique');
    if (categoryCodes.size !== categories.length) throw new Error('System category codes must be unique');
    if (categories.length !== 126) throw new Error(`Expected 126 system categories, found ${categories.length}`);
    for (const category of categories) {
        if (!templateKeys.has(category.defaultTemplateKey)) throw new Error(`Unknown template ${category.defaultTemplateKey} for ${category.code}`);
    }
}
