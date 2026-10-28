import { initialData } from './seed.js';
import { years } from './model.js';

const nameWords = {
  Yelyzaveta: 'Єлизавета', Kramarenko: 'Крамаренко', David: 'Девід', Hall: 'Голл',
  Larisa: 'Лариса', Larysa: 'Лариса', Leonidivna: 'Леонідівна', Fomina: 'Фоміна',
  Oleh: 'Олег', Oleg: 'Олег', Yevhenovych: 'Євгенович', Valentyna: 'Валентина', Petrowna: 'Петрівна',
  Leonid: 'Леонід', Moiseyevych: 'Мойсейович', Geyshys: 'Гейшис', Yevhen: 'Євген', Dmytrovych: 'Дмитрович',
  Yevheniya: 'Євгенія', Grygorivna: 'Григорівна', Dmytro: 'Дмитро', Ivanovych: 'Іванович',
  Hannah: 'Ганна', Alla: 'Алла', Vitaliy: 'Віталій', Ivan: 'Іван', Stepanovych: 'Степанович',
  Mariya: 'Марія', Ivanovna: 'Іванівна', Petro: 'Петро', Pavlo: 'Павло', Tetyana: 'Тетяна',
  Vera: 'Віра', Mykola: 'Микола', Tamara: 'Тамара', Klava: 'Клава', Boris: 'Борис',
  Yuri: 'Юрій', Yuriy: 'Юрій', Lyudmila: 'Людмила', Volodymyr: 'Володимир', Vyktor: 'Віктор',
  Svitlana: 'Світлана', Yevheniy: 'Євгеній', Yevdokiya: 'Євдокія', Timofiivna: 'Тимофіївна',
  Kolosar: 'Колосар', Yakiv: 'Яків', Lavrentyovych: 'Лаврентійович', Lavrentiy: 'Лаврентій',
  Ullyana: 'Уляна', Nataliya: 'Наталія', Lidya: 'Лідія', Oleksiy: 'Олексій', Galyna: 'Галина',
  Artem: 'Артем', Yaroslav: 'Ярослав', Moisey: 'Мойсей', Yakovlevych: 'Якович',
  Musya: 'Муся', Irmovna: 'Ірмівна', Belenkaya: 'Біленька', Irma: 'Ірма', Abramovych: 'Абрамович',
  Belenkiy: 'Біленький', Sonya: 'Соня', Rebecca: 'Ребекка', Riva: 'Ріва', Sima: 'Сіма',
  Lyolya: 'Льоля', Irmovych: 'Ірмович', Petr: 'Петро', Leusenko: 'Леусенко', Oleksandr: 'Олександр',
  Kaydanovska: 'Кайдановська', Michail: 'Михайло', Fomin: 'Фомін', Alina: 'Аліна', Stefan: 'Штефан',
  Bauer: 'Бауер', Viktoria: 'Вікторія', Julian: 'Юліан', Benjamin: 'Беньямін', Petrovna: 'Петрівна',
  Anna: 'Анна', Lykov: 'Ликов', Lykova: 'Ликова', Vasiliy: 'Василь', Natalya: 'Наталія',
  Dmytriy: 'Дмитро', Kateryna: 'Катерина', Alexandra: 'Олександра', Isaak: 'Ісаак', Ioelyevych: 'Йоельович',
  Kaydanovskiy: 'Кайдановський', Iryna: 'Ірина', Kaydanovskaya: 'Кайдановська', Elena: 'Олена',
  Kostyantyn: 'Костянтин', Roman: 'Роман', Lisa: 'Ліза', Shakhin: 'Шахін', Omarov: 'Омаров',
  Masha: 'Маша', Yosifovna: 'Йосипівна', Mirer: 'Мірер', Sofiya: 'Софія', Moiseevna: 'Мойсеївна',
  Krasnnopolskaya: 'Краснопольська', Zachar: 'Захар', Iosif: 'Йосип', Eoel: 'Йоель', Nachimovych: 'Нахімович',
  Bertha: 'Берта', Medvedovskaya: 'Медведовська', Anatoliy: 'Анатолій', Andriy: 'Андрій', Alyona: 'Альона',
  Sergiy: 'Сергій', Olena: 'Олена', Sofa: 'Софа', Alexander: 'Олександр', Max: 'Макс',
};

const places = {
  'Kharkiv, Ukraine': 'Харків, Україна', 'Huskvarna, Sweden': 'Гускварна, Швеція',
  'Kyiv Oblast': 'Київська область', 'Mohylev (Belarus)': 'Могильов (Білорусь)',
  Cherkassy: 'Черкаси', 'Rubsovsk, Altay oblast': 'Рубцовськ, Алтайська область',
  Voronezh: 'Воронеж', Kursk: 'Курськ',
};

const notes = {
  '7bc73a4b-3f6c-447c-b9d6-35abbf2f6a4a': '5 жовтня — автомобільна аварія, перелом хребта, під Губкіним у Бєлгородській області. Мамі було 11 років. Намагався обігнати, але назустріч їхала машина, і він різко звернув убік.',
  'bb7daee8-fa3d-4f93-a1cf-122b85bcda79': 'Місце поховання: військова братська могила у Вроцлаві.\n\nЖили у Феодосії, але через роботу на тютюновій фабриці переїхали до Харкова. Він був сержантом.',
  '06ff06d6-59d6-4e12-ad45-f36ed0cf059f': 'Сестра Соні. Вийшла заміж після її смерті.',
  'd4ffe576-4458-4b5f-adbe-d1b3106f24e9': 'Загинув у 20 років під час Другої світової війни під Москвою.',
  '9f3d72a6-b59a-4c62-939a-7931c42381dc': 'Загинув на початку війни. РСЧА (Робітничо-селянська Червона армія), відрядження до Львова. Був призваний до армії; хтось підпалив гуртожиток.',
  'd9d2595b-c73c-436a-b361-662d4fc08362': 'Були евакуйовані туди. Повернулися до Харкова у 1945 році.',
  '8a5344e7-0ff5-4ef8-a8de-93277070e911': 'Інженер-конструктор, автотракторний факультет.',
  '91691582-c186-488a-8027-bb33eafc6162': 'Родина відома в Харкові. Працював у юридичному відділі виконкому. Його брат Мурат — декан ХІРЕ.',
  '07690d26-65b5-466e-aca0-fb2765370f19': 'Інженер-конструктор.\n\nБатьки одружилися 16 березня 1900 року.\n\nГолодомор: почала навчання у 1932 році. Колгосп у Харківській області, їжу привозили з міста. Два тижні їжу не привозили. Лежали на горах зерна й не могли взяти навіть зернини, бо за це розстрілювали. Потім їх забрали до міста. У Харкові на вулицях лежали мертві люди. У Рубцовську важила 42 кг, коли народила. На трактори ставили гармати, щоб перетворити їх на танки. Люди падали від голоду.',
  '4066e05b-82ec-43b6-b373-5584d9691f5d': 'Лікар-пульмонолог, Талліннський медичний інститут.\n\nБрат жив у Москві. Охрестився, завдяки чому зміг навчатися в Москві. Відомий лікар.',
  '56bf2695-f03c-40be-b32e-e46d203e5c45': 'Родина лікарів та аптекарів.\n\nФельдшер.\n\nЛіто на Журавлівці.',
  'c747ac56-4085-48f0-9eac-85e554e82921': 'Померла від раку.',
};

export const translatedFields = ['firstName', 'lastName', 'birthName', 'birthPlace', 'note'];

export function localizePerson(person, language) {
  if (language !== 'uk') return person;
  const localized = { ...person };
  for (const field of translatedFields) {
    const override = person.translations?.uk?.[field];
    if (typeof override === 'string') localized[field] = override;
    else if (['firstName', 'lastName', 'birthName'].includes(field)) localized[field] = (person[field] || '').replace(/[A-Za-z]+/g, (word) => nameWords[word] || word);
    else if (field === 'birthPlace') localized[field] = places[person[field]] || person[field] || '';
    else localized[field] = person.note === initialData.persons[person.id]?.note ? notes[person.id] || person.note || '' : person.note || '';
  }
  return localized;
}

export function localizeData(data, language) {
  if (language !== 'uk') return data;
  return { ...data, persons: Object.fromEntries(Object.entries(data.persons).map(([id, person]) => [id, localizePerson(person, language)])) };
}

export function savePersonInLanguage(original, draft, language) {
  if (language !== 'uk') return { ...draft };
  const before = localizePerson(original, language);
  const fields = { ...original.translations?.uk };
  translatedFields.forEach((field) => { if (draft[field] !== before[field]) fields[field] = draft[field]; });
  return { ...original, birthDate: draft.birthDate, deathDate: draft.deathDate, translations: { ...original.translations, uk: fields } };
}

export const localizedYears = (person, language) => language === 'uk' ? years(person).replace(/^d\./, 'пом.') : years(person);

const messages = {
  'My Family': 'Моя родина', 'The family archive': 'Родинний архів', 'Private & local': 'Приватно на пристрої',
  'Import JSON': 'Імпорт JSON', 'Export JSON': 'Експорт JSON', 'Import family JSON': 'Імпортувати родину з JSON',
  'Family directory': 'Список родини', 'YOUR FAMILY': 'ВАША РОДИНА', 'Every person.': 'Кожна людина.', 'One story.': 'Одна історія.',
  'Find a person...': 'Знайти людину…', 'Search family': 'Пошук у родині', 'Clear search': 'Очистити пошук',
  Everyone: 'Усі', 'With notes': 'З нотатками', 'No matching people': 'Нікого не знайдено', 'Clear filters': 'Скинути фільтри',
  'Saved on this device': 'Збережено на цьому пристрої', 'Storage unavailable · export to save': 'Сховище недоступне · експортуйте дані',
  'Close family directory': 'Закрити список родини', 'Open family directory': 'Відкрити список родини',
  'Family archive': 'Родинний архів', 'Family tree': 'Родинне дерево', Back: 'Назад', Forward: 'Вперед',
  'Return to me': 'Повернутися до мене', 'Home person': 'Головна особа',
  'Highlight family connections': 'Виділити родинні зв’язки', 'Reading view': 'Режим читання', 'Fit all': 'Показати всіх',
  'Dismiss import error': 'Закрити помилку імпорту', 'Complete family tree': 'Повне родинне дерево',
  'COMPLETE FAMILY TREE': 'ПОВНЕ РОДИННЕ ДЕРЕВО', 'Whole family overview': 'Огляд усієї родини',
  'Zoom out': 'Зменшити масштаб', 'Zoom in': 'Збільшити масштаб', 'Reset to reading zoom': 'Відновити масштаб читання',
  'Fit entire tree': 'Показати все дерево', 'Center selected person': 'Центрувати вибрану особу', Overview: 'Огляд',
  "Mother's side": 'Материнська гілка', "Father's side": 'Батьківська гілка', Other: 'Інші', Divorced: 'Розлучені',
  'Person details': 'Відомості про особу', 'PERSON DETAILS': 'ВІДОМОСТІ ПРО ОСОБУ', 'Close person details': 'Закрити відомості про особу',
  'Edit details': 'Редагувати відомості', 'Locate in tree': 'Знайти на дереві', 'Life details': 'Життєпис',
  Born: 'Дата народження', Died: 'Дата смерті', Birthplace: 'Місце народження', 'Not recorded': 'Не зазначено', 'Birth name': 'Прізвище при народженні',
  'Notes & memories': 'Нотатки та спогади', 'NOTES & MEMORIES': 'НОТАТКИ ТА СПОГАДИ', 'Read full note': 'Читати всю нотатку',
  'Add a note': 'Додати нотатку', 'Family connections': 'Родинні зв’язки', Parents: 'Батьки', 'Parents:': 'Батьки:',
  Partners: 'Партнери', Children: 'Діти', Siblings: 'Брати та сестри', 'No recorded connections': 'Зв’язки не зазначено',
  Partnership: 'Партнерство', Contacts: 'Контакти', married: 'У шлюбі', divorced: 'Розлучені', 'Family union': 'Родина',
  'Close note': 'Закрити нотатку', 'Full note': 'Повна нотатка', 'Clipboard unavailable': 'Буфер обміну недоступний',
  Copied: 'Скопійовано', 'Copy note': 'Копіювати нотатку', 'Edit note': 'Редагувати нотатку',
  'PERSON RECORD': 'ОСОБОВИЙ ЗАПИС', 'Close editor': 'Закрити редактор', 'First name': 'Ім’я та по батькові', 'Last name': 'Прізвище',
  'Birth date': 'Дата народження', 'Death date': 'Дата смерті', Notes: 'Нотатки', Cancel: 'Скасувати', 'Save changes': 'Зберегти зміни',
  'YYYY or YYYY-MM-DD': 'РРРР або РРРР-ММ-ДД', 'Language': 'Мова',
  'This file is not valid JSON. Your current tree is unchanged.': 'Файл не є коректним JSON. Поточне дерево не змінено.',
  'Choose a version 1 family-tree JSON with persons and unions.': 'Виберіть JSON родинного дерева версії 1 з особами та родинами.',
  'The tree must contain at least one person.': 'Дерево має містити принаймні одну особу.',
  'A person has an invalid ID or name.': 'Некоректний ідентифікатор або ім’я особи.',
  'A family union has an invalid format.': 'Некоректний формат родинного запису.',
  'A relationship refers to a person missing from this file.': 'Зв’язок посилається на особу, відсутню у файлі.',
  'A person cannot be their own parent.': 'Особа не може бути власним батьком або матір’ю.',
  'The parent-child relationships contain a cycle.': 'Зв’язки між батьками та дітьми утворюють цикл.',
};

export const translate = (text, language) => language === 'uk' ? messages[text] || text : text;

export function localizeRelationship(label, person, language) {
  if (language !== 'uk' || !label) return label;
  const counterparts = [
    ['father', 'mother', 'parent'], ['grandfather', 'grandmother', 'grandparent'],
    ['son', 'daughter', 'child'], ['grandson', 'granddaughter', 'grandchild'],
    ['brother', 'sister', 'sibling'], ['uncle', 'aunt', "parent's sibling"],
    ['nephew', 'niece', "sibling's child"], ['husband', 'wife', 'spouse'],
  ];
  const parts = [];
  const originalParts = label.toLowerCase().split("'s ");
  originalParts.forEach((part, index) => {
    if (!/^(former )?(partner|husband|wife|spouse)$/.test(part) || !parts.length) {
      parts.push(part);
      return;
    }
    const previous = parts.pop();
    const [, prefix, role] = previous.match(/^((?:great-)*)(.*)$/);
    const pair = counterparts.find((roles) => roles.includes(role));
    const gender = index === originalParts.length - 1 ? person?.gender : null;
    const counterpart = pair ? (gender === 'male' ? pair[0] : gender === 'female' ? pair[1] : role === pair[0] ? pair[1] : role === pair[1] ? pair[0] : pair[2]) : role;
    parts.push(`${part.startsWith('former ') ? 'former ' : ''}${prefix}${counterpart}`);
  });
  const terms = {
    you: ['Ви', 'вас'], father: ['Батько', 'батька'], mother: ['Мати', 'матері'], parent: ['Хтось із батьків', 'когось із батьків'],
    grandfather: ['Дідусь', 'дідуся'], grandmother: ['Бабуся', 'бабусі'], grandparent: ['Дідусь або бабуся', 'дідуся або бабусі'],
    son: ['Син', 'сина'], daughter: ['Донька', 'доньки'], child: ['Дитина', 'дитини'],
    grandson: ['Онук', 'онука'], granddaughter: ['Онука', 'онуки'], grandchild: ['Онук або онука', 'онука або онуки'],
    brother: ['Брат', 'брата'], sister: ['Сестра', 'сестри'], sibling: ['Брат або сестра', 'брата або сестри'],
    uncle: ['Дядько', 'дядька'], aunt: ['Тітка', 'тітки'], nephew: ['Племінник', 'племінника'], niece: ['Племінниця', 'племінниці'],
    husband: ['Чоловік', 'чоловіка'], wife: ['Дружина', 'дружини'], spouse: ['Чоловік або дружина', 'чоловіка або дружини'],
    partner: ['Чоловік або дружина', 'чоловіка або дружини'], 'former husband': ['Колишній чоловік', 'колишнього чоловіка'],
    'former wife': ['Колишня дружина', 'колишньої дружини'], 'former spouse': ['Колишнє подружжя', 'колишнього подружжя'],
  };
  function term(value, possessive, target) {
    const key = value.toLowerCase();
    if (key === 'no recorded relationship') return 'Спорідненість не зазначена';
    if (key.startsWith('former ') && !terms[key]) {
      const female = /(mother|daughter|sister|aunt|niece)$/.test(key) || (target && person?.gender === 'female');
      const prefix = possessive ? (female ? 'колишньої' : 'колишнього') : (female ? 'Колишня' : 'Колишній');
      return `${prefix} ${term(key.slice(7), possessive, target).toLowerCase()}`;
    }
    const great = key.match(/^((?:great-)+)(.+)$/);
    if (great) {
      const count = great[1].split('-').length - 1;
      if (['aunt', 'uncle'].includes(great[2])) {
        const female = great[2] === 'aunt';
        const prefix = possessive ? (female ? 'двоюрідної ' : 'двоюрідного ') : (female ? 'Двоюрідна ' : 'Двоюрідний ');
        return prefix + 'пра'.repeat(count - 1) + term(female ? 'grandmother' : 'grandfather', possessive, false).toLowerCase();
      }
      const descendants = {
        grandson: possessive ? 'внука' : 'внук',
        granddaughter: possessive ? 'внучки' : 'внучка',
      };
      if (great[2] === 'grandparent' || great[2] === 'grandchild') {
        const bases = great[2] === 'grandparent' ? (possessive ? ['дідуся', 'бабусі'] : ['дідусь', 'бабуся']) : (possessive ? ['внука', 'внучки'] : ['внук', 'внучка']);
        const result = bases.map((base) => 'пра'.repeat(count) + base).join(' або ');
        return possessive ? result : result[0].toUpperCase() + result.slice(1);
      }
      const base = descendants[great[2]] || term(great[2], possessive, target).toLowerCase();
      const result = 'пра'.repeat(count) + base;
      return possessive ? result : result[0].toUpperCase() + result.slice(1);
    }
    const cousin = key.match(/^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+th) cousin(.*)$/);
    if (cousin) {
      const degree = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'].indexOf(cousin[1]) + 2;
      const female = target && person?.gender === 'female';
      const male = target && person?.gender === 'male';
      const prefix = degree === 2 ? 'двоюрідн' : degree === 3 ? 'троюрідн' : `${degree || Number.parseInt(cousin[1], 10) + 1}-юрідн`;
      const relative = possessive ? `${prefix}${female ? 'ої сестри' : male ? 'ого брата' : 'ого родича'}` : `${prefix}${female ? 'а сестра' : male ? 'ий брат' : 'ий родич'}`;
      const removal = cousin[2] ? ` (різниця поколінь: ${cousin[2].includes('once') ? 1 : cousin[2].includes('twice') ? 2 : Number.parseInt(cousin[2], 10)})` : '';
      const result = relative + removal;
      return possessive ? result : result[0].toUpperCase() + result.slice(1);
    }
    if (key === 'partner' && target && person?.gender === 'female') return terms.wife[possessive ? 1 : 0];
    if (key === 'partner' && target && person?.gender === 'male') return terms.husband[possessive ? 1 : 0];
    return terms[key]?.[possessive ? 1 : 0] || value;
  }
  return parts.reverse().map((part, index) => term(part, index > 0, index === 0)).join(' ');
}