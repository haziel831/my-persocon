// Shop consumables (1.9.7): curated 16x16 pixel-art icons copied into
// src/renderer/assets/consumables/. Referenced with relative URLs so the
// Tauri webview can load them (absolute D:\ paths are blocked).
const art = (file) => new URL(`./assets/consumables/${file}`, import.meta.url).href;
// Bigger 32x32 art (1.9.8) from Assets\NEW\Ghostpixxells_pixelfood, copied to
// src/renderer/assets/food32/. Drawn at its native size so the pixels stay crisp.
const art32 = (file) => new URL(`./assets/food32/${file}`, import.meta.url).href;

const food = (id, cat, name, price, file, effects) => ({
  id, cat, name, price,
  img: art(file),
  effects,
});

const dish = (id, cat, name, price, file, effects) => ({
  id, cat, name, price,
  img: art32(file),
  art32: true,
  effects,
});

export const FOOD_ITEMS = [
  // ---------- Comidas (foco: Fome) ----------
  food('fd_onigiri', 'comidas', 'Onigiri', 15, 'onigiri_1.png', { hunger: 20 }),
  food('fd_egg_fried', 'comidas', 'Fried Egg', 12, 'eggs_fried.png', { hunger: 18 }),
  food('fd_egg_scrambled', 'comidas', 'Scrambled Eggs', 15, 'eggs_scrambled.png', { hunger: 22 }),
  food('fd_baguette', 'comidas', 'Baguette', 18, 'pastry_baguette.png', { hunger: 24 }),
  food('fd_bread', 'comidas', 'Bread', 15, 'pastry_bread.png', { hunger: 20 }),
  food('fd_croissant', 'comidas', 'Croissant', 22, 'pastry_croissant.png', { hunger: 25, mood: 4 }),
  food('fd_brioche', 'comidas', 'Brioche', 25, 'pastry_brioche.png', { hunger: 28, mood: 4 }),
  food('fd_pretzel', 'comidas', 'Pretzel', 20, 'pastry_pretzel.png', { hunger: 22 }),
  food('fd_canned_soup', 'comidas', 'Canned Soup', 20, 'canned_soup.png', { hunger: 30 }),
  food('fd_gouda', 'comidas', 'Gouda', 25, 'cheese_gouda.png', { hunger: 22 }),
  food('fd_corn', 'comidas', 'Corn', 15, 'vegetable_corn.png', { hunger: 20 }),
  food('fd_pumpkin', 'comidas', 'Pumpkin', 20, 'vegetable_pumpkin.png', { hunger: 24 }),
  food('fd_apple', 'comidas', 'Apple', 10, 'fruit_apple.png', { hunger: 12, mood: 2 }),
  food('fd_banana', 'comidas', 'Banana', 10, 'fruit_banana.png', { hunger: 12, mood: 2 }),

  // ---------- Pratos (1.9.8, arte 32×32) ----------
  // Preço e efeitos pelo tipo de comida: prato principal enche a fome (e custa mais),
  // lanche é barato e dá um pouco de alegria, sobremesa é cara, dá muita alegria e
  // quase nenhuma fome.
  dish('fd_burger', 'comidas', 'Burger', 22, 'burger.png', { hunger: 28, mood: 4 }),
  dish('fd_pizza', 'comidas', 'Pizza', 24, 'pizza.png', { hunger: 30, mood: 6 }),
  dish('fd_sushi', 'comidas', 'Sushi', 26, 'sushi.png', { hunger: 24, mood: 8 }),
  dish('fd_ramen', 'comidas', 'Ramen', 22, 'ramen.png', { hunger: 28, mood: 5 }),
  dish('fd_spaghetti', 'comidas', 'Spaghetti', 20, 'spaghetti.png', { hunger: 28, mood: 3 }),
  dish('fd_macncheese', 'comidas', 'Mac and Cheese', 18, 'macncheese.png', { hunger: 24, mood: 7 }),
  dish('fd_curry', 'comidas', 'Curry', 22, 'curry.png', { hunger: 28, mood: 5 }),
  dish('fd_burrito', 'comidas', 'Burrito', 20, 'burrito.png', { hunger: 26, mood: 6 }),
  dish('fd_taco', 'comidas', 'Taco', 15, 'taco.png', { hunger: 20, mood: 6 }),
  dish('fd_sandwich', 'comidas', 'Sandwich', 15, 'sandwich.png', { hunger: 20, mood: 4 }),
  dish('fd_hotdog', 'comidas', 'Hot Dog', 14, 'hotdog.png', { hunger: 18, mood: 6 }),
  dish('fd_pancakes', 'comidas', 'Pancakes', 18, 'pancakes.png', { hunger: 22, mood: 8 }),
  dish('fd_waffle', 'comidas', 'Waffle', 18, 'waffle.png', { hunger: 20, mood: 9 }),
  dish('fd_roastedchicken', 'comidas', 'Roasted Chicken', 26, 'roastedchicken.png', { hunger: 30, mood: 5 }),
  dish('fd_steak', 'comidas', 'Steak', 32, 'steak.png', { hunger: 32, mood: 6 }),
  dish('fd_salmon', 'comidas', 'Salmon', 28, 'salmon.png', { hunger: 26, mood: 8 }),
  dish('fd_dumplings', 'comidas', 'Dumplings', 20, 'dumplings.png', { hunger: 24, mood: 6 }),
  dish('fd_omlet', 'comidas', 'Omelet', 16, 'omlet.png', { hunger: 20, mood: 3 }),
  // Lanches: baratos, enchem pouco e deixam ela contenta.
  dish('fd_frenchfries', 'comidas', 'French Fries', 12, 'frenchfries.png', { hunger: 14, mood: 6 }),
  dish('fd_nacho', 'comidas', 'Nachos', 13, 'nacho.png', { hunger: 14, mood: 7 }),
  dish('fd_cheesepuff', 'comidas', 'Cheese Puff', 12, 'cheesepuff.png', { hunger: 12, mood: 6 }),
  dish('fd_garlicbread', 'comidas', 'Garlic Bread', 14, 'garlicbread.png', { hunger: 14, mood: 5 }),
  dish('fd_popcorn', 'comidas', 'Popcorn', 10, 'popcorn.png', { hunger: 8, mood: 8 }),
  dish('fd_potatochips', 'comidas', 'Potato Chips', 10, 'potatochips.png', { hunger: 10, mood: 7 }),

  // ---------- Bebidas ----------
  // thirst é o nível de hidratação (cai com o tempo): valor alto = sede matada.
  // Energéticos dão muita energia e matam menos a sede; chá e leite de soja só hidratam.
  food('bv_espresso', 'bebidas', 'Espresso', 15, 'coffee_espresso.png', { energy: 35, thirst: 10 }),
  food('bv_mocha', 'bebidas', 'Mocha', 20, 'coffee_mocha.png', { thirst: 30 }),
  food('bv_cappuccino', 'bebidas', 'Cappuccino', 20, 'coffee_foam.png', { energy: 18, thirst: 26 }),
  food('bv_green_tea', 'bebidas', 'Green Tea', 15, 'coffee_greentea.png', { thirst: 30 }),
  food('bv_tea', 'bebidas', 'Tea', 15, 'coffee_tea.png', { thirst: 26 }),
  food('bv_cola', 'bebidas', 'Zap Cola', 12, 'soda_coke.png', { energy: 8, thirst: 30 }),
  food('bv_fanta', 'bebidas', 'Solar Fizz', 12, 'soda_fanta.png', { energy: 8, thirst: 30 }),
  food('bv_pepsi', 'bebidas', 'Ice Blue', 12, 'soda_pepsi.png', { energy: 8, thirst: 30 }),
  food('bv_sprite', 'bebidas', 'Lime Rush', 12, 'soda_sprite.png', { energy: 8, thirst: 30 }),
  food('bv_soy_choco', 'bebidas', 'Chocolate Soymilk', 18, 'soymilk_choco.png', { thirst: 26, hunger: 6 }),
  food('bv_soy_strawberry', 'bebidas', 'Strawberry Soymilk', 18, 'soymilk_strawberry.png', { thirst: 26, mood: 8 }),
  food('bv_soy_matcha', 'bebidas', 'Matcha Soymilk', 20, 'soymilk_match.png', { thirst: 30 }),
  food('bv_soy_coffee', 'bebidas', 'Coffee Soymilk', 20, 'soymilk_coffee.png', { energy: 22, thirst: 24 }),
  // Energético: muita energia, mas deixa ela com sede (a hidratação cai).
  food('bv_energy', 'bebidas', 'Energy Drink', 22, 'energy_drink.png', { energy: 45, thirst: -12 }),

  // ---------- Sobremesas (preço alto, pouca fome, muito humor) ----------
  food('sb_cheesecake', 'sobremesas', 'Cheesecake', 60, 'cake_cheese.png', { hunger: 5, mood: 38 }),
  food('sb_chocolate_cake', 'sobremesas', 'Chocolate Cake', 65, 'cake_chocolate.png', { hunger: 5, mood: 42 }),
  food('sb_matcha_cake', 'sobremesas', 'Matcha Cake', 58, 'cake_matcha.png', { hunger: 5, mood: 36 }),
  food('sb_redvelvet_cake', 'sobremesas', 'Red Velvet Cake', 68, 'cake_redvelvet.png', { hunger: 5, mood: 45 }),
  food('sb_strawberry_cake', 'sobremesas', 'Strawberry Cake', 62, 'cake_strawberry.png', { hunger: 5, mood: 40 }),
  food('sb_popsicle_blue', 'sobremesas', 'Blue Popsicle', 30, 'popsicle_blue.png', { hunger: 2, mood: 20 }),
  food('sb_popsicle_green', 'sobremesas', 'Green Popsicle', 30, 'popsicle_green.png', { hunger: 2, mood: 20 }),
  food('sb_popsicle_pink', 'sobremesas', 'Pink Popsicle', 30, 'popsicle_pink.png', { hunger: 2, mood: 22 }),
  food('sb_popsicle_red', 'sobremesas', 'Red Popsicle', 30, 'popsicle_red.png', { hunger: 2, mood: 20 }),
  food('sb_popsicle_yellow', 'sobremesas', 'Yellow Popsicle', 30, 'popsicle_yellow.png', { hunger: 2, mood: 20 }),
  food('sb_jam_strawberry', 'sobremesas', 'Strawberry Jam', 25, 'jam_strawberry.png', { hunger: 5, mood: 18 }),
  food('sb_jam_blueberry', 'sobremesas', 'Blueberry Jam', 25, 'jam_blueberry.png', { hunger: 5, mood: 18 }),

  // ---------- Doces (1.9.8, arte 32×32) ----------
  // Sobremesa: cara, pouca fome e muito humor. Doce simples sai mais barato.
  dish('sb_applepie', 'sobremesas', 'Apple Pie', 38, 'applepie.png', { hunger: 5, mood: 28 }),
  dish('sb_lemonpie', 'sobremesas', 'Lemon Pie', 38, 'lemonpie.png', { hunger: 5, mood: 28 }),
  dish('sb_fruitcake', 'sobremesas', 'Fruit Cake', 40, 'fruitcake.png', { hunger: 5, mood: 30 }),
  dish('sb_donut', 'sobremesas', 'Donut', 32, 'donut.png', { hunger: 4, mood: 24 }),
  dish('sb_gingerbreadman', 'sobremesas', 'Gingerbread Man', 28, 'gingerbreadman.png', { hunger: 4, mood: 22 }),
  dish('sb_pudding', 'sobremesas', 'Pudding', 30, 'pudding.png', { hunger: 4, mood: 24 }),
  dish('sb_icecream', 'sobremesas', 'Ice Cream', 30, 'icecream.png', { hunger: 3, mood: 22 }),
  dish('sb_cookies', 'sobremesas', 'Cookies', 26, 'cookies.png', { hunger: 4, mood: 20 }),
  dish('sb_chocolate', 'sobremesas', 'Chocolate', 28, 'chocolate.png', { hunger: 3, mood: 22 }),
  dish('sb_jelly', 'sobremesas', 'Jelly', 24, 'jelly.png', { hunger: 2, mood: 18 }),
  dish('sb_gummybear', 'sobremesas', 'Gummy Bear', 22, 'gummybear.png', { hunger: 2, mood: 18 }),
];
