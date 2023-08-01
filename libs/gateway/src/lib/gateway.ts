import { stitchSchemas } from '@graphql-tools/stitch';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { type Executor, isAsyncIterable } from '@graphql-tools/utils';
import { buildSchema, GraphQLSchema, parse } from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';

import { stitchRelaySubschemas } from './relay-stitch';
import { GatewayOptions, SubschemaOptions } from './types';

async function fetchRemoteSchema(executor: Executor) {
  const introspectionResult = await executor({
    document: parse(`{ _sdl }`),
  });
  if (isAsyncIterable(introspectionResult)) {
    throw new Error('🚨 Expected executor to return a single result');
  }
  return buildSchema(introspectionResult.data._sdl);
}

async function createSubschema(
  config: SubschemaOptions
): Promise<SubschemaConfig> {
  if (!config.schema) {
    const executor: Executor = buildHTTPExecutor({ endpoint: config.url });
    config.schema = await fetchRemoteSchema(executor);
  }

  const subschemaConfig: SubschemaConfig = {
    schema: config.schema,
    executor: buildHTTPExecutor({
      endpoint: config.url,
      headers: config.headers,
    }),
    batch: true,
  };

  return subschemaConfig;
}

export async function createGatewaySchema(
  options: GatewayOptions
): Promise<GraphQLSchema> {
  const subschemas = await Promise.all(
    options.subschema.map((config) => createSubschema(config))
  );
  const schema = stitchSchemas({
    subschemas: stitchRelaySubschemas(subschemas, options.getTypeNameFromId),
    mergeTypes: true,
  });
  return schema;
}
