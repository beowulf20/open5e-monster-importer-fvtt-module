const fs = require('fs');
const os = require('os');
const path = require('path');

const overridesPath = path.join(__dirname, '../../tools/fc5-compendium/icon-overrides.json');

const spellInput = {
  name: 'Operator Spark',
  level: 1,
  school: 'EV',
  ritual: false,
  time: 'Action',
  range: '60 feet',
  components: 'V, S',
  duration: 'Instantaneous',
  classes: 'Wizard',
  text: 'A bright test spell.\n\nSource:\tOperator Manual p. 1',
  modifiers: [],
  rolls: []
};

describe('FC5 icon tools', () => {
  let originalOverrides;
  const createdFiles = [];

  beforeEach(() => {
    originalOverrides = fs.existsSync(overridesPath) ? fs.readFileSync(overridesPath, 'utf8') : '{}\n';
  });

  afterEach(() => {
    global.fetch = undefined;
    createdFiles.splice(0).forEach((filePath) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    fs.writeFileSync(overridesPath, originalOverrides);
    jest.resetModules();
  });

  const writeSourceDocument = (sourceRoot, document) => {
    const spellDir = path.join(sourceRoot, 'fc5-spells');
    fs.mkdirSync(spellDir, { recursive: true });
    fs.writeFileSync(path.join(spellDir, 'operator.json'), JSON.stringify(document, null, 2));
  };

  const sourceDocument = {
    _id: 'operator00000000',
    name: 'Operator Spark',
    type: 'spell',
    img: 'icons/magic/symbols/question-stone-yellow.webp',
    system: {
      source: { book: 'Operator Manual', rules: '2024' },
      description: { value: '<p>A bright test spell.</p>' }
    },
    flags: {
      'monster-creator': {
        fc5: {
          type: 'spell',
          sourceBook: 'Operator Manual',
          rules: '2024'
        }
      }
    }
  };

  test('detects generic generated icons in source queues', () => {
    const { isGenericIcon } = require('../../tools/fc5-compendium/icon-tools');

    expect(isGenericIcon('icons/magic/symbols/question-stone-yellow.webp')).toBe(true);
    expect(isGenericIcon('modules/monster-creator/assets/fc5-icons/spells/operator.webp')).toBe(false);
  });

  test('lists missing icons from generated source documents', () => {
    const { listIconQueue } = require('../../tools/fc5-compendium/icon-tools');
    const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fc5-icons-'));
    writeSourceDocument(sourceRoot, sourceDocument);

    const queue = listIconQueue({ sourceRoot });

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      name: 'Operator Spark',
      packKey: 'spells',
      status: 'missing'
    });
  });

  test('approving a URL downloads the image and stores a local module asset path', async () => {
    const tools = require('../../tools/fc5-compendium/icon-tools');
    const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fc5-icons-'));
    writeSourceDocument(sourceRoot, sourceDocument);
    const [entry] = tools.listIconQueue({ sourceRoot });
    const bytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00]);

    global.fetch = jest.fn(async () => ({
      ok: true,
      headers: {
        get: () => 'image/webp'
      },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    }));

    const result = await tools.approveIcon({
      sourceRoot,
      iconKey: entry.iconKey,
      image: {
        kind: 'url',
        value: 'https://example.com/operator.webp'
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(new URL('https://example.com/operator.webp'));
    expect(result.override.img).toMatch(/^modules\/monster-creator\/assets\/fc5-icons\/fc5spells\/.+\.webp$/);
    expect(result.override.img).not.toBe('https://example.com/operator.webp');

    const localPath = path.join(__dirname, '../..', result.override.img.replace(/^modules\/monster-creator\//, 'monster-creator/'));
    createdFiles.push(localPath);
    expect(fs.existsSync(localPath)).toBe(true);
  });

  test('FC5 conversion applies approved icon overrides', () => {
    let { convertSpell } = require('../../tools/fc5-compendium');
    const { documentIconKey } = require('../../tools/fc5-compendium/icon-tools');
    const baseline = convertSpell(spellInput);
    const iconKey = documentIconKey(baseline, 'fc5spells');
    const img = 'modules/monster-creator/assets/fc5-icons/fc5spells/operator-spark.webp';

    fs.writeFileSync(overridesPath, JSON.stringify({
      [iconKey]: {
        img,
        approved: true,
        status: 'approved'
      }
    }, null, 2));

    jest.resetModules();
    ({ convertSpell } = require('../../tools/fc5-compendium'));

    expect(convertSpell(spellInput).img).toBe(img);
  });
});
