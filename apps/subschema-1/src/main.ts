import { createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { schema } from '@graphql-medley/tests/subschema-1';

const yoga = createYoga({
  schema,
});

const server = createServer(yoga);

server.listen(3001, () => {
  console.log('Visit http://localhost:3001/graphql');
});
