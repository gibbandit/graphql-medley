import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { schema } from '@graphql-medley/tests/subschema-2';
const yoga = createYoga({
  schema,
  logging: 'debug',
});

const server = createServer(yoga);

server.listen(3002, () => {
  console.log('Visit http://localhost:3002/graphql');
});
