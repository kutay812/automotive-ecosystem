const fs = require('fs');
const path = require('path');

const models = [
  {
    name: 'car',
    plural: 'cars',
    displayName: 'Car',
    desc: 'Rent a car entity',
    attributes: {
      brand: { type: 'string' },
      model: { type: 'string' },
      year: { type: 'integer' },
      pricePerDay: { type: 'decimal' },
      description: { type: 'text' },
      image: { type: 'media', multiple: false, required: false, allowedTypes: ['images'] },
      isAvailable: { type: 'boolean', default: true }
    }
  },
  {
    name: 'project',
    plural: 'projects',
    displayName: 'Production Project',
    desc: 'Media production showcase',
    attributes: {
      title: { type: 'string', required: true },
      client: { type: 'string' },
      videoUrl: { type: 'string' },
      description: { type: 'richtext' },
      date: { type: 'date' }
    }
  },
  {
    name: 'lead',
    plural: 'leads',
    displayName: 'Lead',
    desc: 'Contact form submissions',
    attributes: {
      name: { type: 'string', required: true },
      email: { type: 'email', required: true },
      phone: { type: 'string' },
      message: { type: 'text' },
      source: { type: 'string' }
    }
  }
];

const basePath = path.join(__dirname, 'backend', 'src', 'api');

models.forEach(model => {
  const modelPath = path.join(basePath, model.name);
  
  // Create dirs
  ['content-types', 'controllers', 'routes', 'services'].forEach(dir => {
    fs.mkdirSync(path.join(modelPath, dir, dir === 'content-types' ? model.name : ''), { recursive: true });
  });

  // Schema json
  const schema = {
    kind: 'collectionType',
    collectionName: model.plural,
    info: {
      singularName: model.name,
      pluralName: model.plural,
      displayName: model.displayName,
      description: model.desc
    },
    options: { draftAndPublish: true },
    pluginOptions: {},
    attributes: model.attributes
  };
  fs.writeFileSync(path.join(modelPath, 'content-types', model.name, 'schema.json'), JSON.stringify(schema, null, 2));

  // Controller
  const tsContentController = `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreController('api::${model.name}.${model.name}');`;
  fs.writeFileSync(path.join(modelPath, 'controllers', `${model.name}.ts`), tsContentController);

  // Router
  const tsContentRouter = `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreRouter('api::${model.name}.${model.name}');`;
  fs.writeFileSync(path.join(modelPath, 'routes', `${model.name}.ts`), tsContentRouter);

  // Service
  const tsContentService = `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreService('api::${model.name}.${model.name}');`;
  fs.writeFileSync(path.join(modelPath, 'services', `${model.name}.ts`), tsContentService);

  console.log(`Created Strapi API structure for: ${model.name}`);
});

console.log('All backend models created successfully!');
