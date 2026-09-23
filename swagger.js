const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Campus Helpdesk API',
      version: '1.0.0',
      description: 'توثيق واجهات برمجة التطبيقات لنظام الهيلبديسك الجامعي',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
      // 💡 التعديل الأول: ضفنا سيرفر الـ Production عشان السواجر يشتغل لايف
      {
        url: process.env.SERVER_URL || 'https://your-production-url.com', 
        description: 'Production Server',
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'أدخل التوكن الخاص بك هكذا: Bearer <token>',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  // 👈 التعديل التاني: خلينا حرف الـ R كابيتال عشان سيرفر لينكس
  apis: ['./Routes/*.js'], 
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // عدلت رسالة اللوج عشان تكون ديناميكية أكتر
  console.log('📄 Swagger Docs are up and running at /api-docs');
};

module.exports = swaggerDocs;