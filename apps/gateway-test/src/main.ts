import { createGatewaySchema } from '@graphql-medley/gateway';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { decodeGlobalID } from '@pothos/plugin-relay';
import { schema as subschema1 } from '@graphql-medley/tests/subschema-1';
import { schema as subschema2 } from '@graphql-medley/tests/subschema-2';

const schema = createGatewaySchema({
  subschema: [
    {
      schema: subschema1,
      endpoint: 'http://localhost:3001/graphql',
    },
    {
      schema: subschema2,
      endpoint: 'http://localhost:3002/graphql',
    },
  ],
  getTypeNameFromId: (id) => decodeGlobalID(id).typename,
});

const yoga = createYoga({
  schema,
});

const server = createServer(yoga);

server.listen(3000, () => {
  console.log('Visit http://localhost:3000/graphql');
});
