/**
 * Translation utilities for categories, offer types, and other enums
 * Data stored in database in English, translations handled on client
 */

// Category translations (English → Polish)
export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  // Sports
  Football: 'Piłka nożna',
  Basketball: 'Koszykówka',
  Volleyball: 'Siatkówka',
  Tennis: 'Tenis',
  Swimming: 'Pływanie',
  Athletics: 'Lekkoatletyka',
  Gymnastics: 'Gimnastyka',
  'Martial Arts': 'Sztuki walki',
  Dancing: 'Taniec',
  Cycling: 'Kolarstwo',
  'Ice Skating': 'Łyżwiarstwo',
  Skateboarding: 'Skateboarding',
  Climbing: 'Wspinaczka',
  Yoga: 'Joga',
  Fitness: 'Fitness',

  // Arts & Crafts
  Painting: 'Malarstwo',
  Drawing: 'Rysunek',
  Sculpture: 'Rzeźba',
  Pottery: 'Ceramika',
  Photography: 'Fotografia',
  Music: 'Muzyka',
  Singing: 'Śpiew',
  Drama: 'Dramat',
  Theater: 'Teatr',
  Film: 'Film',
  'Creative Writing': 'Pisanie kreatywne',
  Crafts: 'Rękodzieło',
  Design: 'Projektowanie',

  // STEM
  Programming: 'Programowanie',
  Robotics: 'Robotyka',
  Science: 'Nauka',
  Mathematics: 'Matematyka',
  Physics: 'Fizyka',
  Chemistry: 'Chemia',
  Biology: 'Biologia',
  Engineering: 'Inżynieria',
  '3D Printing': 'Druk 3D',
  Electronics: 'Elektronika',

  // Languages & Communication
  English: 'Angielski',
  Spanish: 'Hiszpański',
  French: 'Francuski',
  German: 'Niemiecki',
  Italian: 'Włoski',
  Mandarin: 'Mandaryński',
  Japanese: 'Japoński',
  'Public Speaking': 'Mówienie publiczne',
  Debate: 'Debata',

  // Outdoor & Nature
  Hiking: 'Wędrówki górskie',
  Camping: 'Biwakowanie',
  Gardening: 'Ogrodnictwo',
  'Environmental Science': 'Nauka o środowisku',
  Birdwatching: 'Obserwacja ptaków',
  Fishing: 'Wędkarstwo',

  // Games & Hobbies
  'Board Games': 'Gry planszowe',
  'Video Games': 'Gry wideo',
  Chess: 'Szachy',
  Puzzles: 'Puzzle',
  Collecting: 'Zbieranie',
  'Model Building': 'Budowanie modeli',

  // Academic
  Tutoring: 'Korepetycje',
  'Test Preparation': 'Przygotowanie do testów',
  'Language Learning': 'Nauka języków',
};

// Offer type translations (English → Polish)
export const OFFER_TYPE_TRANSLATIONS: Record<string, string> = {
  Class: 'Klasa',
  Workshop: 'Warsztat',
  Camp: 'Obóz',
  Course: 'Kurs',
  'Private Lesson': 'Lekcja prywatna',
  'Group Session': 'Sesja grupowa',
  Seminar: 'Seminarium',
  Tournament: 'Turniej',
  Exhibition: 'Wyprawa',
  Performance: 'Występ',
  Coaching: 'Coaching',
  Mentoring: 'Mentoring',
};

/**
 * Translate a category name from English to Polish
 * @param name - Category name in English
 * @returns Translated name in Polish, or original name if not found
 */
export function translateCategory(name: string): string {
  return CATEGORY_TRANSLATIONS[name] || name;
}

/**
 * Translate an offer type name from English to Polish
 * @param name - Offer type name in English
 * @returns Translated name in Polish, or original name if not found
 */
export function translateOfferType(name: string): string {
  return OFFER_TYPE_TRANSLATIONS[name] || name;
}

/**
 * Get all available categories with translations
 * @returns Array of objects with English name and Polish translation
 */
export function getAllCategoryTranslations() {
  return Object.entries(CATEGORY_TRANSLATIONS).map(([english, polish]) => ({
    english,
    polish,
  }));
}

/**
 * Get all available offer types with translations
 * @returns Array of objects with English name and Polish translation
 */
export function getAllOfferTypeTranslations() {
  return Object.entries(OFFER_TYPE_TRANSLATIONS).map(([english, polish]) => ({
    english,
    polish,
  }));
}
