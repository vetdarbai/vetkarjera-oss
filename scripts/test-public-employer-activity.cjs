// Presentation-only cases, run inside the existing isolated employer UI harness.
const catalog = require('../lib/organizations/catalogs.json');

module.exports = async function publicActivityQA({ actor, rpc, mutate, owner, session, origin, eq, ok, overflow, capture }) {
  const a = await actor('employer');
  await rpc(a, 'create_org_draft');
  await mutate(a, 'patch_org_public', {
    name: 'Nemuno veterinarijos klinika', organization_type_code: 'veterinary_clinic',
    description: 'Kaune veikianti smulkiųjų gyvūnų klinika, kurioje rūpinamės šunų, kačių ir egzotinių gyvūnų sveikata. Atliekame profilaktinius patikrinimus, laboratorinius tyrimus, vidaus ligų diagnostiką ir chirurgines procedūras.\n\nMūsų komandoje svarbūs aiškūs darbo procesai, kolegų palaikymas ir nuolatinis profesinis tobulėjimas. Naujam kolegai skiriame mentorių ir deriname darbo grafiką.',
    public_email: 'darbas@nemunovet.example.invalid', website: 'https://nemunovet.example.invalid', employee_size_code: 'size_2',
  });
  await mutate(a, 'save_org_locations', { cities: [{ city_name: 'Kaunas' }] });
  await mutate(a, 'save_org_legal_draft', { legal_name: 'Nemuno gyvūnų sveikata, UAB', legal_form_code: 'uab', legal_code: '309876543' });
  await mutate(a, 'save_own_representative_details', { first_name: 'Rūta', last_name: 'Petraitė', capacity: 'Klinikos vadovė', private_phone: '+37000000000' });
  await mutate(a, 'save_org_benefits', { standard: ['mentorship', 'flexible_schedule', 'modern_equipment', 'training_conferences'], custom: [] });
  const { context, page } = await session(a);
  const activity = page.locator('.public-employer-activity');
  const saveGroups = async groups => mutate(a, 'save_org_type_block', { type_revision: (await owner(a)).typeRevision, groups });
  const visit = async width => {
    await page.setViewportSize({ width, height: 900 });
    eq((await page.goto(origin + '/darbdaviai/' + (await owner(a)).organization.slug)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll('nav a')].some(e => Object.keys(e).some(k => k.startsWith('__reactProps$'))));
    await overflow(page);
  };
  const surrounding = () => page.evaluate(() => {
    const snapshot = selector => {
      const e = document.querySelector(selector), s = getComputedStyle(e);
      return { html: e.outerHTML, x: e.getBoundingClientRect().x, width: e.getBoundingClientRect().width,
        font: s.font, color: s.color, padding: s.padding, gap: s.gap, border: s.border, background: s.backgroundColor };
    };
    return [snapshot('.public-employer-contact-module'), snapshot('.public-employer-benefits')];
  });
  const checkGroups = async width => {
    const c = await owner(a);
    const dto = (await rpc(null, 'resolve_org_slug', { slug: c.organization.slug })).profile;
    const expected = (dto.typeBlock || []).flatMap(g => {
      const group = catalog.groups.find(item => item.type === dto.primaryType && item.code === g.group);
      const selected = g.options.flatMap(code => {
        const option = catalog.options.find(item => item.type === dto.primaryType && item.group === g.group && item.code === code);
        return option && code !== 'other' ? [option.label] : [];
      });
      const values = [...selected, ...g.custom].filter(Boolean);
      return group && values.length ? [{ label: group.label, values: values.join(' · ') }] : [];
    });
    eq(await activity.locator('dt > span:last-child').allTextContents(), expected.map(g => g.label), 'DTO group order/labels, empty groups hidden');
    eq(await activity.locator('dd').allTextContents(), expected.map(g => g.values), 'DTO value order and dot separators');
    const geometry = await activity.evaluate(section => {
      const h = section.querySelector('h2'), dl = section.querySelector('dl');
      const rows = [...dl.children].map(row => {
        const title = row.querySelector('dt'), marker = title.firstElementChild, label = title.lastElementChild, value = row.querySelector('dd');
        const r = row.getBoundingClientRect(), t = title.getBoundingClientRect(), m = marker.getBoundingClientRect(), l = label.getBoundingClientRect(), v = value.getBoundingClientRect();
        const ts = getComputedStyle(title), vs = getComputedStyle(value), rs = getComputedStyle(row);
        return { titleFont: [ts.fontSize, ts.lineHeight, ts.fontWeight], valueFont: [vs.fontSize, vs.lineHeight, vs.fontWeight],
          marker: [m.width, m.height, marker.getAttribute('aria-hidden'), getComputedStyle(marker).backgroundColor],
          primary: getComputedStyle(section).getPropertyValue('--primary').trim(), gap: l.x - m.right, aligned: l.x === v.x, markerOffset: m.y - t.y,
          borderTop: rs.borderTopWidth, borderBottom: rs.borderBottomWidth, paddingTop: rs.paddingTop, paddingBottom: rs.paddingBottom,
          rowWidth: r.width, contentWidth: dl.getBoundingClientRect().width, valueGap: v.y - t.bottom,
          wrapping: vs.whiteSpace, clipping: vs.textOverflow, scroll: value.scrollWidth > value.clientWidth || value.scrollHeight > value.clientHeight };
      });
      return { rows, headingGap: dl.getBoundingClientRect().y - h.getBoundingClientRect().bottom,
        dlMargins: getComputedStyle(dl).margin, nextBorder: getComputedStyle(section.nextElementSibling).borderTopWidth,
        sectionBottomBorder: getComputedStyle(section).borderBottomWidth, padding: [getComputedStyle(section).paddingLeft, getComputedStyle(section).paddingRight] };
    });
    eq(geometry.headingGap, 20, 'H2 to first group');
    eq(geometry.dlMargins, '0px'); eq(geometry.padding, ['0px', '0px'], 'No extra horizontal card padding');
    eq([geometry.sectionBottomBorder, geometry.nextBorder], ['0px', '1px'], 'Single existing next-section boundary');
    for (const [i, g] of geometry.rows.entries()) {
      eq(g.titleFont, ['16px', '24px', '600']); eq(g.valueFont, ['16px', '24px', '400']);
      eq(g.marker.slice(0, 3), [3, 16, 'true']); eq(g.marker[3], 'rgb(45, 108, 223)', 'Existing medical-blue token');
      eq([g.gap, g.aligned, g.markerOffset, g.valueGap], [12, true, 4, 6]);
      eq([g.borderTop, g.borderBottom], [i ? '1px' : '0px', '0px'], 'Only between visible groups');
      eq([g.paddingTop, g.paddingBottom], [i ? `${width <= 900 ? 16 : 18}px` : '0px', i === geometry.rows.length - 1 ? '0px' : `${width <= 900 ? 16 : 18}px`]);
      eq(g.rowWidth, g.contentWidth, 'Full-width separator'); eq([g.wrapping, g.clipping, g.scroll], ['normal', 'clip', false], 'Natural wrapping, no clipping/scroll area');
    }
  };
  const one = [{ group_code: 'animals', options: ['dogs'], custom: [] }, { group_code: 'clinical_areas', options: [], custom: [] }, { group_code: 'working_models', options: [], custom: [] }];
  await saveGroups(one);
  const surroundingByWidth = new Map(), oneHeight = new Map();
  for (const width of [320, 360, 390, 1440]) {
    await visit(width); await checkGroups(width); eq(await activity.locator('dl > div').count(), 1);
    surroundingByWidth.set(width, await surrounding()); oneHeight.set(width, (await activity.boundingBox()).height);
  }
  const many = [
    { group_code: 'animals', options: ['dogs', 'cats', 'exotics'], custom: [] },
    { group_code: 'clinical_areas', options: ['general_practice', 'internal_medicine', 'surgery', 'diagnostics', 'dentistry', 'orthopedics_traumatology'], custom: [] },
    { group_code: 'working_models', options: ['daytime_clinic', 'inpatient'], custom: [] },
  ];
  await saveGroups(many);
  for (const width of [320, 360, 390, 1440]) {
    await visit(width); await checkGroups(width); eq(await activity.locator('dl > div').count(), 3);
    eq(await surrounding(), surroundingByWidth.get(width), 'Contacts/sidebar and benefits markup/styles/width unchanged');
    ok((await activity.boundingBox()).height > oneHeight.get(width), 'Long lists grow vertically');
  }
  await capture(page, '10-public-activity-desktop', 1440);
  await capture(page, '11-public-activity-mobile', 390);
  await saveGroups([{ group_code: 'animals', options: ['dogs', 'other'], custom: ['Smulkieji egzotiniai gyvūnai, kuriems reikalinga specializuota diagnostika ir ilgalaikė veterinarinė priežiūra', 'VeterinarinėDiagnostika'.repeat(8)] }, many[1], many[2]]);
  for (const width of [320, 360, 390, 1440]) {
    await visit(width); await checkGroups(width); eq(await surrounding(), surroundingByWidth.get(width));
    ok((await activity.locator('dd').first().boundingBox()).height > 24, 'Long natural text and unbroken token wrap');
  }
  await mutate(a, 'patch_org_public', { organization_type_code: 'laboratory_diagnostics' });
  await saveGroups([{ group_code: 'diagnostic_areas', options: ['clinical_pathology'], custom: [] }, { group_code: 'served_sectors_species', options: [], custom: ['Smulkiųjų gyvūnų veterinarijos klinikos ir universitetinės gyvūnų sveikatos tyrimų laboratorijos'] }]);
  for (const width of [320, 360, 390, 1440]) {
    await visit(width); await checkGroups(width);
    eq(await activity.locator('dt > span:last-child').last().textContent(), 'Aptarnaujami sektoriai / rūšys', 'Longest real catalog group title/type adaptation');
    await page.waitForFunction(() => [...document.querySelectorAll('.public-employer-activity dt > span:last-child')].every(e => Object.keys(e).some(k => k.startsWith('__reactProps$'))));
    // DOM-only synthetic title stress case. No catalog/DTO/code changes; never used in deliverable screenshots.
    await activity.locator('dt > span:last-child').last().evaluate(e => { e.textContent = 'Specializuotos veterinarinės diagnostikos ir gyvūnų sveikatos tyrimų veiklos sritys'; });
    await overflow(page);
    const title = await activity.locator('dt').last().boundingBox(), value = await activity.locator('dd').last().boundingBox();
    ok(value.y >= title.y + title.height + 6, 'Multiline group title cannot collide with values');
    if (width < 1440) ok(title.height > 24, 'Long group title wraps on mobile');
  }
  // The existing RPC patches specified groups; an empty groups array is a no-op.
  await saveGroups(catalog.groups.filter(g => g.type === 'laboratory_diagnostics').map(g => ({ group_code: g.code, options: [], custom: [] })));
  for (const width of [320, 360, 390, 1440]) {
    await visit(width); eq(await activity.count(), 0, 'Entire empty activity section hidden');
    eq(await surrounding(), surroundingByWidth.get(width));
  }
  await context.close();
};
