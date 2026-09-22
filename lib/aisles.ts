/**
 * Which part of the shop an ingredient lives in, so the list can be walked in
 * one pass instead of doubling back for the eggs.
 *
 * A keyword table rather than an API call: Spoonacular can classify
 * ingredients, but every lookup would spend points from a 50-a-day budget on a
 * question a lookup table answers well enough. It also works offline, which is
 * exactly when someone is standing in a supermarket with no signal.
 *
 * First match wins, and the order matters: "chicken stock" must hit Pantry
 * before Meat claims it for "chicken", so the more specific phrases are listed
 * in earlier aisles or earlier within an aisle.
 */

export type Aisle =
  | 'Produce'
  | 'Bakery'
  | 'Meat & fish'
  | 'Dairy & eggs'
  | 'Pantry'
  | 'Herbs & spices'
  | 'Frozen'
  | 'Drinks'
  | 'Other';

/** Roughly the order you meet them walking through a supermarket. */
export const AISLE_ORDER: Aisle[] = [
  'Produce',
  'Bakery',
  'Meat & fish',
  'Dairy & eggs',
  'Pantry',
  'Herbs & spices',
  'Frozen',
  'Drinks',
  'Other',
];

// Checked in this order, not AISLE_ORDER — see the note above.
const RULES: [Aisle, string[]][] = [
  ['Frozen', ['frozen', 'ice cream']],
  [
    'Pantry',
    [
      'stock', 'broth', 'bouillon', 'canned', 'tinned', 'tin of', 'can of', 'passata',
      'tomato paste', 'tomato puree', 'coconut milk', 'coconut cream', 'flour', 'sugar', 'rice', 'pasta',
      'spaghetti', 'noodle', 'oats', 'lentil', 'chickpea', 'bean', 'quinoa', 'couscous',
      'oil', 'vinegar', 'soy sauce', 'sauce', 'ketchup', 'mayonnaise', 'mustard', 'honey',
      'syrup', 'jam', 'peanut butter', 'nut', 'almond', 'cashew', 'walnut', 'seed',
      'baking powder', 'baking soda', 'bicarbonate', 'yeast', 'cocoa', 'chocolate',
      'vanilla', 'breadcrumb', 'cornstarch', 'cornflour', 'cereal',
    ],
  ],
  [
    'Herbs & spices',
    [
      'salt', 'black pepper', 'ground pepper', 'peppercorn', 'paprika', 'cumin', 'coriander seed', 'turmeric', 'cinnamon',
      'nutmeg', 'chili powder', 'chilli powder', 'cayenne', 'oregano', 'thyme', 'rosemary',
      'bay leaf', 'curry powder', 'garam masala', 'spice', 'seasoning', 'ground cloves',
      'ground coriander', 'ground ginger',
    ],
  ],
  [
    'Dairy & eggs',
    ['milk', 'butter', 'cheese', 'cream', 'yoghurt', 'yogurt', 'egg', 'parmesan', 'feta',
     'mozzarella', 'cheddar', 'ricotta', 'ghee'],
  ],
  [
    'Meat & fish',
    ['chicken', 'beef', 'pork', 'lamb', 'mince', 'bacon', 'sausage', 'ham', 'turkey',
     'steak', 'fish', 'salmon', 'tuna', 'prawn', 'shrimp', 'cod', 'hake', 'mussel',
     'squid', 'chorizo', 'boerewors'],
  ],
  ['Bakery', ['bread', 'loaf', 'roll', 'bun', 'baguette', 'tortilla', 'wrap', 'pita', 'naan', 'croissant']],
  [
    'Produce',
    [
      'onion', 'garlic', 'ginger', 'tomato', 'potato', 'carrot', 'celery', 'lettuce',
      'spinach', 'kale', 'cabbage', 'broccoli', 'cauliflower', 'pepper', 'chilli', 'chili',
      'cucumber', 'courgette', 'zucchini', 'aubergine', 'eggplant', 'mushroom', 'avocado',
      'lemon', 'lime', 'orange', 'apple', 'banana', 'berry', 'berries', 'grape', 'mango',
      'pineapple', 'herb', 'parsley', 'coriander', 'cilantro', 'basil', 'mint', 'dill',
      'spring onion', 'scallion', 'leek', 'squash', 'pumpkin', 'sweet potato', 'corn',
      'pea', 'green bean', 'salad', 'rocket', 'fruit', 'vegetable',
    ],
  ],
  ['Drinks', ['juice', 'wine', 'beer', 'water', 'soda', 'coffee', 'tea']],
];

/**
 * Whole words only, with an optional plural. Plain substring matching sent
 * "6 cloves garlic" to spices via "clove", "nutmeg" to the pantry via "nut",
 * and "eggplant" to dairy via "egg".
 */
const MATCHERS: [Aisle, RegExp[]][] = RULES.map(([aisle, words]) => [
  aisle,
  // Keywords are plain letters and spaces, so they're safe to drop in unescaped.
  words.map((w) => new RegExp(`\\b${w}(?:s|es)?\\b`, 'i')),
]);

export function aisleFor(name: string): Aisle {
  for (const [aisle, patterns] of MATCHERS) {
    if (patterns.some((re) => re.test(name))) return aisle;
  }
  return 'Other';
}
