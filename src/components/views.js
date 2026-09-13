// Oblique Equal Earth — an interactive equal-area world map.
// Copyright (C) 2026 Georg Ogris
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version. See the LICENSE file, or <https://www.gnu.org/licenses/>.

/**
 * A catalogue of preset orientations, grouped one level deep.
 *
 * These are chosen the way a science communicator would choose them: each one
 * exists to make a specific point that the default north-up, Atlantic-centred
 * view actively hides. Rotations are written with centreOn(lon, lat, roll) so
 * they read as the place being framed rather than as negated angles.
 *
 * Each view carries three pieces of text: `note`, a one-line hint used as the
 * button tooltip; `explanation`, three to five plain sentences for the reader;
 * and `wiki`, the title of an English Wikipedia article to read next.
 */
import {centreOn} from "./angles.js";

export const VIEW_GROUPS = [
  {
    name: "Familiar starting points",
    blurb: "The same planet, re-centred. Which one looks like “the” world map says more about where the atlas was printed than about geography.",
    views: [
      {
        name: "Atlantic centred", rotation: centreOn(0, 0), wiki: "Prime meridian",
        note: "The European schoolroom default. Splits the Pacific down both edges.",
        explanation: "This is the world map most Europeans and Africans grew up with. It puts the line through Greenwich in London down the middle. That choice is political history, not geography: Britain was the dominant sea power when the world agreed on a starting meridian in 1884. The cost is that the Pacific, the largest thing on Earth, gets cut in half and pushed to both edges."
      },
      {
        name: "Pacific centred", rotation: centreOn(180, 0), wiki: "Pacific Ocean",
        note: "How most of Asia and the Americas print their atlases.",
        explanation: "Turn the globe halfway and the Pacific becomes whole. This is the standard world map in Japan, China, Australia and much of the Americas. Suddenly Asia and the Americas are neighbours facing each other across one ocean, which is exactly how trade and migration have worked for centuries. The Atlantic gets chopped instead, and Europe drifts to the edge."
      },
      {
        name: "Americas centred", rotation: centreOn(-90, 0), wiki: "Americas",
        note: "Puts the New World in the middle and cuts Eurasia in half.",
        explanation: "Here the Americas run down the centre from pole to pole. It shows something the usual map hides: the two continents are long and thin, and almost every part of them is close to an ocean. Eurasia is the one that gets split now, appearing on both sides. No arrangement can avoid cutting something — a sphere simply does not unroll into a rectangle."
      },
      {
        name: "Africa & Europe", rotation: centreOn(20, 0), wiki: "Africa",
        note: "Africa at the centre and at true relative size.",
        explanation: "Africa sits in the middle here, and because this projection is equal-area, it is drawn at its true size relative to everything else. That is worth pausing on. On the Mercator maps used by most web mapping services, Greenland looks about as big as Africa. In reality you could fit Greenland into Africa roughly fourteen times over."
      },
      {
        name: "Asia centred", rotation: centreOn(100, 0), wiki: "Asia",
        note: "Frames the continent where most people actually live.",
        explanation: "Roughly six in every ten people alive are inside this view. It covers China, India, Southeast Asia and Indonesia in a single frame. The land is enormous and mostly continuous, which is why goods and ideas moved across it overland for thousands of years before anyone sailed around it. Centring the map here makes Europe look like what it is geographically: a peninsula on the western end of Asia."
      },
      {
        name: "South-up", rotation: centreOn(0, 0, 180), wiki: "Reversed map",
        note: "North-at-the-top is a convention, not a property of the planet.",
        explanation: "Space has no up. A globe spinning in the dark has an axis, but nothing marks which end is the top. Medieval European maps often put east at the top, and some Islamic maps of the same era put south there. North-up won out with European sea charts and the magnetic compass, and it has felt inevitable ever since — which is precisely why it is worth turning over."
      }
    ]
  },
  {
    name: "The poles",
    blurb: "The two regions every rectangular world map lies about most, and the only two you cannot see properly without rotating.",
    views: [
      {
        name: "North Pole", rotation: centreOn(0, 90), wiki: "Arctic",
        note: "An ocean ringed by continents, not a landmass.",
        explanation: "The Arctic is water. Most of what looks like solid white at the top of a normal map is floating sea ice, a few metres thick, drifting on a deep ocean. From directly above you can see the ring of land around it: Canada, Greenland, Scandinavia and Russia all facing inward. This is why Arctic politics involves so many countries at once — they share a coastline on the same sea."
      },
      {
        name: "South Pole", rotation: centreOn(0, -90), wiki: "Antarctica",
        note: "A continent ringed by ocean — the exact inverse of the Arctic.",
        explanation: "The south polar region is the mirror image of the north. Here there is real rock and real ice sheet, kilometres thick, sitting on a continent larger than Europe. Around it there is nothing but open water, all the way around. That isolation matters: with no land in the way, wind and current can circle the planet uninterrupted, and Antarctica stays locked in its own cold."
      },
      {
        name: "Antarctica whole", rotation: centreOn(20, -80), wiki: "Antarctic ice sheet",
        note: "Normally smeared across the bottom edge; here it is one landmass.",
        explanation: "On a rectangular map Antarctica is stretched into a meaningless white band along the bottom. Rotate to look at it properly and it becomes a single round continent with a recognisable shape. It holds around 60% of all the fresh water on Earth, frozen. If all of it melted, sea level would rise by something like 58 metres — which is why the shape of this ice is watched so closely."
      },
      {
        name: "Antarctic Peninsula", rotation: centreOn(-60, -70), wiki: "Antarctic Peninsula",
        note: "The fastest-warming arm of the continent.",
        explanation: "This long finger of land reaches north out of Antarctica toward South America. Because it extends furthest from the pole, it is the warmest part of the continent and the part changing fastest. Ice shelves along its coast have broken up within living memory, some in a matter of weeks. It is also where most Antarctic research stations and tourist ships go, simply because it is the easiest place to reach."
      },
      {
        name: "Arctic sea routes", rotation: centreOn(-100, 75), wiki: "Northwest Passage",
        note: "The Northwest Passage and the ice that is opening it.",
        explanation: "For centuries European ships searched for a way over the top of North America to Asia, and crews died trying. The route exists, threading between Canadian islands, but it was reliably choked with ice. As Arctic sea ice thins, it has begun to open in late summer. A shortcut here would cut thousands of kilometres off a voyage from Europe to East Asia, which is why shipping companies and governments watch it closely."
      },
      {
        name: "Bering Strait", rotation: centreOn(-170, 65), wiki: "Beringia",
        note: "Eighty-two kilometres between continents.",
        explanation: "At its narrowest, only about 82 kilometres of shallow water separate Asia from North America. During the last ice age so much water was locked up in ice sheets that sea level fell and this seabed became dry land. People and animals walked across. Almost everyone in the Americas before 1492 descended from populations that came through this gap, and you cannot see how narrow it is on a map that splits the Pacific."
      },
      {
        name: "Greenland ice sheet", rotation: centreOn(-42, 72), wiki: "Greenland ice sheet",
        note: "On Mercator it rivals Africa; here it is about the size of the Congo.",
        explanation: "Greenland is the standard example of what map projections do to your sense of scale. On the Mercator projection it appears roughly as large as Africa. On this equal-area map you can see the truth: it is big, but comparable to the Democratic Republic of the Congo. It is still the second largest body of ice on the planet, and it is losing mass fast enough to be measured from orbit."
      }
    ]
  },
  {
    name: "Ocean basins",
    blurb: "One connected world ocean, conventionally divided into five. Click the water itself to read about it.",
    views: [
      {
        name: "Pacific Ocean", rotation: centreOn(-160, 0), wiki: "Pacific Ocean",
        note: "Big enough to hold every continent with room to spare.",
        explanation: "The Pacific covers about a third of the Earth's surface. Put every continent together and you could drop them into it and still have water left over. Magellan's crew named it: after the storms of the southern tip of South America, the water beyond seemed peaceful. That name is badly misleading, since its rim is the most seismically violent zone on the planet."
      },
      {
        name: "Atlantic Ocean", rotation: centreOn(-30, 0), wiki: "Atlantic Ocean",
        note: "The young ocean, still widening every year.",
        explanation: "The Atlantic is a comparatively young ocean that did not exist when the continents were joined. It opened as the Americas pulled away from Europe and Africa, and it is still opening. New seafloor is created along a ridge running down its middle, pushing the two sides apart by a few centimetres a year — about the rate your fingernails grow. Trace the coastlines on either side and you can still see how they once fitted together."
      },
      {
        name: "Indian Ocean", rotation: centreOn(75, -20), wiki: "Indian Ocean",
        note: "The only ocean closed off to the north.",
        explanation: "The Indian Ocean is unusual because it runs into a wall. Asia blocks it to the north, so unlike the Atlantic and Pacific it cannot exchange water with the Arctic. That closed northern end is what makes the monsoon so powerful, as the enormous landmass heats and cools far faster than the sea beside it. It was also the world's busiest long-distance trade route long before Europeans arrived, because its winds reverse on a reliable schedule."
      },
      {
        name: "Southern Ocean", rotation: centreOn(0, -60), wiki: "Southern Ocean",
        note: "Defined by a current rather than by coastlines.",
        explanation: "Most oceans are defined by the land around them. This one is not — it is the band of water encircling Antarctica, and its boundary is a current. It was only formally recognised as a separate ocean in recent decades, and not everyone agrees. What is not in doubt is its importance: this is where much of the world's deep water forms and sinks, driving circulation in every other ocean."
      },
      {
        name: "Arctic Ocean", rotation: centreOn(0, 85), wiki: "Arctic Ocean",
        note: "The smallest and shallowest, and the one with a lid.",
        explanation: "The Arctic is the smallest ocean and the shallowest, with broad continental shelves around its edge. What makes it unlike any other is the lid of floating ice on top. That ice reflects sunlight straight back to space, so losing it means the dark water underneath absorbs more heat, which melts more ice. This self-reinforcing loop is a large part of why the Arctic is warming several times faster than the global average."
      },
      {
        name: "Point Nemo", rotation: centreOn(-123.4, -48.9), wiki: "Point Nemo",
        note: "The oceanic pole of inaccessibility.",
        explanation: "This is the spot in the ocean furthest from any land, about 2,700 kilometres from the nearest coast in every direction. It is so remote that when the International Space Station passes overhead, the closest humans are usually the ones in orbit rather than anyone on a ship. Space agencies use the area as a graveyard for decommissioned spacecraft, steering them down here because there is nothing to hit. The name comes from Jules Verne's Captain Nemo."
      }
    ]
  },
  {
    name: "Land, water and people",
    blurb: "Hemispheres chosen not by convention but by what is actually in them.",
    views: [
      {
        name: "Land hemisphere", rotation: centreOn(-1.5, 47.2), wiki: "Land and water hemispheres",
        note: "The half of Earth with the most land — still nearly half ocean.",
        explanation: "Of all the ways to slice the planet in two, this half contains the most land. It is centred near Nantes in western France. Here is the striking part: even this, the landiest possible hemisphere, is still roughly half water. Land is not the normal condition of the Earth's surface, it is the exception."
      },
      {
        name: "Water hemisphere", rotation: centreOn(178.5, -47.2), wiki: "Land and water hemispheres",
        note: "Its opposite, and almost entirely water.",
        explanation: "This is the exact opposite half, centred near New Zealand. It is about nine parts water to one part land. If an alien probe arrived and happened to photograph this side, it would reasonably conclude that Earth is an ocean planet with a few specks on it. That conclusion would be closer to the truth than the impression given by most world maps."
      },
      {
        name: "Population centre", rotation: centreOn(83, 27), wiki: "World population",
        note: "Near the Ganges plain, where half of humanity lives nearby.",
        explanation: "Population is not spread evenly across the planet, it is clumped. This view is centred near northern India, close to where a circle drawn on the globe captures the greatest number of people. Within a few thousand kilometres of here live something like half of everyone alive. Rivers explain much of it: flat, well-watered plains have supported dense farming for millennia."
      },
      {
        name: "The empty quarter", rotation: centreOn(-140, -30), wiki: "South Pacific Ocean",
        note: "The largest expanse of Earth with essentially nobody on it.",
        explanation: "This is the opposite of the previous view. The South Pacific holds the biggest stretch of the planet with almost no permanent human population. There are scattered islands, but the distances between them are measured in thousands of kilometres of open water. It is a useful corrective to maps crowded with country names: most of the Earth's surface has no one standing on it."
      }
    ]
  },
  {
    name: "Plate tectonics",
    blurb: "Earthquakes, volcanoes and mountain belts trace plate edges — visible only when you frame the plate, not the country.",
    views: [
      {
        name: "Pacific Ring of Fire", rotation: centreOn(-170, 0), wiki: "Ring of Fire",
        note: "About 90% of the world's earthquakes happen around this rim.",
        explanation: "The edge of the Pacific is a nearly continuous horseshoe of volcanoes and earthquake zones, running from New Zealand up through Japan, across to Alaska and down the Americas. The reason is that the Pacific seafloor is being pushed under the plates around it. Roughly nine in ten of the world's earthquakes occur along this line. It is a single connected feature, but you cannot see that on a map that cuts the Pacific in half."
      },
      {
        name: "Mid-Atlantic Ridge", rotation: centreOn(-25, 0), wiki: "Mid-Atlantic Ridge",
        note: "A mountain range 16,000 km long, almost entirely underwater.",
        explanation: "Running down the centre of the Atlantic is one of the longest mountain ranges on Earth, and almost nobody has seen it. It marks the seam where new seafloor is made as the plates pull apart. Iceland is the main place where the ridge rises above sea level, which is why the island is so volcanic and why it is slowly splitting in two. The ridge traces the same curve as the coastlines on either side, because they were all once the same join."
      },
      {
        name: "Alpide belt", rotation: centreOn(50, 35), wiki: "Alpide belt",
        note: "Alps to Himalaya: one continuous collision zone.",
        explanation: "The Alps, the mountains of Turkey and Iran, and the Himalaya are not separate accidents — they are one belt. Africa and India are both driving north into Eurasia, and this range is the crumpled material where they meet. India is still moving, which is why the Himalaya are still rising and the region still has large earthquakes. Seen in one frame, the belt reads as a single scar across the continent."
      },
      {
        name: "East African Rift", rotation: centreOn(36, 0), wiki: "East African Rift",
        note: "A continent actively tearing open.",
        explanation: "Africa is splitting along a line running roughly from the Red Sea down to Mozambique. The floor between the cracks has dropped, making a chain of long, deep lakes and steep valley walls. Volcanoes such as Kilimanjaro sit along it. Given a few tens of millions of years, the sea will flood in and the eastern strip will break away. It is the same process that opened the Atlantic, caught in the act."
      },
      {
        name: "Pacific Plate", rotation: centreOn(-150, -10), wiki: "Pacific Plate",
        note: "The largest tectonic plate, almost all of it seafloor.",
        explanation: "This is the biggest single piece of the Earth's outer shell, and it is almost entirely ocean floor. It is moving northwest at roughly the speed a fingernail grows. As it slides over a fixed hot spot in the mantle, it has punched out a line of volcanoes. The Hawaiian islands are that trail: oldest to the northwest, youngest and still erupting to the southeast."
      }
    ]
  },
  {
    name: "Climate and circulation",
    blurb: "Heat moves from the equator to the poles. These are the routes it takes.",
    views: [
      {
        name: "Equatorial belt", rotation: centreOn(-20, 0), wiki: "Intertropical Convergence Zone",
        note: "Where the sun delivers most of its energy.",
        explanation: "Sunlight hits the equator almost straight on and the poles at a glancing angle, so the tropics receive far more energy per square metre. That imbalance is the engine for nearly all weather. Warm, wet air rises in a band near the equator, dumps rain, and spreads toward both poles. Every wind system and ocean current on the planet is ultimately the atmosphere and ocean trying to even out this one difference."
      },
      {
        name: "Gulf Stream", rotation: centreOn(-40, 45), wiki: "Gulf Stream",
        note: "Why Norway is habitable and Labrador, at the same latitude, is not.",
        explanation: "A warm current runs up the east coast of North America and then out across the Atlantic toward Europe. It carries an enormous amount of heat northeast. Compare two places at the same latitude: Bergen in Norway has mild winters, while Labrador in Canada is frozen. The difference is largely this river of warm water, and it is part of a larger overturning circulation that scientists watch for signs of slowing."
      },
      {
        name: "Circumpolar Current", rotation: centreOn(140, -60), wiki: "Antarctic Circumpolar Current",
        note: "The only current that circles the globe unobstructed.",
        explanation: "Because there is no land in the way at these latitudes, water can flow all the way around Antarctica without hitting anything. It is the largest ocean current on Earth by volume, moving more water than all the world's rivers combined many times over. It acts like a moat, keeping warm water from the north away from the continent. When it began, tens of millions of years ago, Antarctica froze."
      },
      {
        name: "Monsoon Asia", rotation: centreOn(85, 20), wiki: "Monsoon",
        note: "A seasonal wind reversal that sets the calendar for billions.",
        explanation: "Land heats and cools much faster than the sea. In summer the huge Asian landmass warms, air rises over it, and moist ocean air is pulled in behind — bringing torrential rain. In winter the process reverses and dry air flows outward. Agriculture across India and Southeast Asia is built around that timing, so a monsoon that arrives late or weak is a serious economic event, not just bad weather."
      },
      {
        name: "El Niño Pacific", rotation: centreOn(-140, 0), wiki: "El Niño",
        note: "A few degrees of water temperature here rearranges world weather.",
        explanation: "Normally winds push warm surface water toward the western Pacific, letting cold water well up near South America. Every few years those winds slacken and the warm water sloshes back east. That shift in sea temperature changes where the great rain clouds form, and the effects travel: drought in Australia and Indonesia, floods in Peru, altered hurricane seasons. It is the clearest example of how one patch of ocean can drive weather worldwide."
      },
      {
        name: "Sahara & trade winds", rotation: centreOn(10, 20), wiki: "Hadley cell",
        note: "Descending dry air makes the desert; the same air carries dust to the Amazon.",
        explanation: "Air that rises at the equator travels poleward, cools, and sinks again at around 30 degrees north and south. Sinking air warms and dries out, which is why the world's great deserts sit in two bands at those latitudes. The Sahara is the largest hot desert of them all. Winds lift its dust across the Atlantic, and that dust delivers nutrients that help fertilise the Amazon rainforest."
      }
    ]
  },
  {
    name: "Life on Earth",
    blurb: "Biology clusters where climate and geology allow it, in patterns no political map shows.",
    views: [
      {
        name: "Amazon basin", rotation: centreOn(-60, -5), wiki: "Amazon rainforest",
        note: "One river system draining an area the size of Australia.",
        explanation: "The Amazon drains a basin roughly the size of Australia, and it discharges more fresh water than the next several largest rivers combined. The forest it waters holds a share of the world's known species that is wildly out of proportion to its area. Much of its rain is recycled: trees release water vapour that falls again further inland, so the forest partly makes its own weather. Cut enough of it and that cycle weakens."
      },
      {
        name: "Congo basin", rotation: centreOn(22, -2), wiki: "Congo Basin",
        note: "The second great rainforest, and the least studied.",
        explanation: "Central Africa holds the second largest tropical rainforest on the planet. It is far less familiar than the Amazon and far less studied, though it stores a comparable amount of carbon per hectare. Its peatlands, only mapped properly in recent years, turned out to be among the largest in the tropics. It is home to forest elephants, bonobos and gorillas, all of which need continuous forest to move through."
      },
      {
        name: "Coral Triangle", rotation: centreOn(125, -2), wiki: "Coral Triangle",
        note: "The most biodiverse marine region on the planet.",
        explanation: "The waters around Indonesia, the Philippines and New Guinea contain more coral and reef fish species than anywhere else on Earth. Something like three quarters of all known coral species live here. The reason is geography: a maze of islands, shallow seas and currents creates countless slightly different habitats side by side. Hundreds of millions of people depend on these reefs for food and coastal protection."
      },
      {
        name: "Wallace Line", rotation: centreOn(118, -5), wiki: "Wallace Line",
        note: "A narrow strait separating Asian from Australian animals.",
        explanation: "Alfred Russel Wallace noticed something strange about a narrow stretch of water in Indonesia. On one side the animals are Asian: monkeys, tigers, woodpeckers. On the other they are Australian, with marsupials and cockatoos. The gap is small, but the water between is deep and was never bridged, so the two faunas evolved apart for tens of millions of years. It was one of the observations that led Wallace to natural selection, independently of Darwin."
      },
      {
        name: "Boreal forest ring", rotation: centreOn(90, 62), wiki: "Taiga",
        note: "The largest land biome, encircling the north.",
        explanation: "A belt of conifer forest wraps almost the whole way around the northern hemisphere, across Canada, Scandinavia and Siberia. It is the largest land biome on the planet, and on a normal map it is broken into unrelated pieces at the left and right edges. Looking down from above the pole shows it as one continuous ring. The soils and permafrost beneath it hold a vast amount of carbon."
      }
    ]
  },
  {
    name: "Routes and chokepoints",
    blurb: "How people and goods actually move, and the handful of places they must squeeze through.",
    views: [
      {
        name: "Silk Road", rotation: centreOn(65, 40), wiki: "Silk Road",
        note: "Overland Eurasia, the connection sea-centred maps hide.",
        explanation: "For well over a thousand years the main link between China, India, Persia and the Mediterranean was overland. Goods were handed from trader to trader across deserts and mountain passes, and very few people travelled the whole way. Ideas, religions and diseases moved along the same roads, including the plague. Centring on Central Asia makes it obvious why this region was once the middle of the world rather than the edge of several empires."
      },
      {
        name: "Magellan's crossing", rotation: centreOn(-150, -20), wiki: "Magellan expedition",
        note: "The Pacific leg that took 99 days and nearly killed the crew.",
        explanation: "In 1520 an expedition led by Ferdinand Magellan rounded the southern tip of South America and struck out west. Nobody in Europe knew how wide the Pacific was, and the answer was far wider than anyone guessed. The crossing took about 99 days with almost no fresh food, and many of the crew died. Only one ship of the original five completed the circumnavigation, and Magellan himself was killed in the Philippines."
      },
      {
        name: "Polynesian navigation", rotation: centreOn(-170, -15), wiki: "Polynesian navigation",
        note: "Thousands of kilometres of open ocean, settled deliberately.",
        explanation: "Polynesian voyagers settled islands scattered across an area larger than any land empire, using no compass, charts or instruments. They navigated by stars, swell patterns, cloud formations and the flight paths of birds. This was not drifting by accident; return voyages were part of the method. By the time Europeans arrived, nearly every habitable island in this enormous triangle had already been found."
      },
      {
        name: "Suez & the Red Sea", rotation: centreOn(38, 22), wiki: "Suez Canal",
        note: "A narrow channel carrying a large share of world trade.",
        explanation: "The Suez Canal cuts through Egypt to join the Mediterranean and the Red Sea, sparing ships the entire voyage around Africa. A substantial share of global seaborne trade passes through a waterway only a couple of hundred metres wide. In 2021 a single grounded container ship blocked it for six days and disrupted supply chains worldwide. Chokepoints like this are invisible on a political map and obvious the moment you frame the region."
      },
      {
        name: "Strait of Hormuz", rotation: centreOn(56.4, 26.6), wiki: "Strait of Hormuz",
        note: "Nearly all Gulf oil leaves through this one gap.",
        explanation: "Almost all the oil leaving the Persian Gulf has to pass through this single strait. At its narrowest it is about 33 kilometres across, and the usable shipping lanes are narrower still. Roughly a fifth of the world's oil consumption travels through it every day. A few pipelines bypass it, but they cannot carry anything close to that volume, which is why any threat to close it moves prices worldwide."
      },
      {
        name: "Panama & the isthmus", rotation: centreOn(-80, 9), wiki: "Isthmus of Panama",
        note: "The land bridge that split an ocean and joined two continents.",
        explanation: "A few million years ago the seafloor rose and closed the gap between North and South America. That did two enormous things. It cut the direct connection between the Atlantic and Pacific, rerouting ocean currents and probably helping trigger ice ages. It also opened a bridge over which animals moved between the continents in both directions, reshaping the wildlife of both. The canal reopened the sea route for ships in 1914."
      },
      {
        name: "Strait of Malacca", rotation: centreOn(101, 3), wiki: "Strait of Malacca",
        note: "The busiest shipping lane in the world, and one of the narrowest.",
        explanation: "Almost everything moving by sea between the Indian Ocean and East Asia squeezes through this strait between Sumatra and the Malay Peninsula. At its narrowest it is only a few kilometres across. Tens of thousands of ships pass each year, carrying much of the oil that supplies China, Japan and South Korea. Singapore's wealth is largely a consequence of sitting at one end of it."
      }
    ]
  },
  {
    name: "Seeing the projection",
    blurb: "Oblique views that make the projection itself visible. Watch the graticule tilt — that is the map's own geometry, not the Earth's.",
    views: [
      {
        name: "Tilted Africa", rotation: centreOn(20, 0, 30), wiki: "Map projection",
        note: "A modest roll. The parallels stop being horizontal lines.",
        explanation: "Give the globe a gentle twist and something becomes visible that was hidden before. The grid of latitude and longitude lines, called the graticule, stops running neatly across the page and starts to lean. Those lines belong to the Earth, so they have not changed; what changed is the map's own frame. This is the simplest way to see that a projection is a choice laid over the planet, not a property of it."
      },
      {
        name: "Diagonal Pacific", rotation: centreOn(-160, 30, 45), wiki: "Map projection",
        note: "Yaw, pitch and roll together — a fully oblique aspect.",
        explanation: "All three rotation axes are in play here, so the map is in what cartographers call an oblique aspect. The projection still does exactly what it always does; it has simply been handed a globe that is turned. Shapes near the centre stay faithful while those at the edges stretch, just as they always do — but now the centre is somewhere unusual. Every map you have ever seen made this same choice, usually without telling you."
      },
      {
        name: "Australia on top", rotation: centreOn(135, -25, 180), wiki: "McArthur's Universal Corrective Map of the World",
        note: "The McArthur inversion, centred where it belongs.",
        explanation: "In 1979 an Australian named Stuart McArthur published a world map with south at the top and Australia near the centre. He had been mocked at school for coming from the bottom of the map. Nothing about it is wrong: it is the same planet, drawn with a different convention. The discomfort people feel looking at it is the point of the exercise."
      },
      {
        name: "Equator vertical", rotation: centreOn(0, 0, 90), wiki: "Graticule (cartography)",
        note: "The equator now runs top to bottom. Same projection, quarter turn.",
        explanation: "Rolling a quarter turn stands the whole coordinate system on its side. The equator, normally the horizontal line through the middle, now runs from top to bottom. The poles sit out to the left and right instead of above and below. It is deeply disorienting, which is exactly what makes it useful: it shows how much of your sense of where things are comes from the frame rather than from the Earth."
      },
      {
        name: "Over the top", rotation: centreOn(0, 60, 200), wiki: "Quaternion",
        note: "Past a pole and rolled beyond half a turn.",
        explanation: "This orientation is past a pole and rolled more than halfway over. Maps built on simple angle arithmetic tend to jam or flip at exactly this sort of position, because the three angles interfere with one another near the poles. This one uses quaternions, a way of describing rotation that has no such awkward spots. That is why you can keep dragging in one direction here and the world simply keeps turning."
      }
    ]
  }
];

/** Flat list of every view, for lookups and tests. */
export const ALL_VIEWS = VIEW_GROUPS.flatMap((group) =>
  group.views.map((view) => ({...view, group: group.name}))
);
