import { stitchSchemas } from '@graphql-tools/stitch';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import {
  type Executor,
  isAsyncIterable,
  filterSchema,
} from '@graphql-tools/utils';
import { buildSchema, GraphQLSchema, parse } from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';

import { stitchMedleySubschemas } from './stitch';
import { GatewayOptions, SubschemaOptions } from './types';

async function fetchRemoteSchema(executor: Executor) {
  const introspectionResult = await executor({
    document: parse(`{ _sdl }`),
  });
  if (isAsyncIterable(introspectionResult)) {
    throw new Error('🚨 Expected executor to return a single result!');
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

  class removeSdlFromQueryTransform {
    transformSchema(originalWrappingSchema: GraphQLSchema) {
      return filterSchema({
        schema: originalWrappingSchema,
        rootFieldFilter: (_operationName, fieldName) => fieldName !== '_sdl',
      });
    }
  }

  const subschemaConfig: SubschemaConfig = {
    schema: config.schema,
    executor: buildHTTPExecutor({
      endpoint: config.url,
      headers: config.headers,
    }),
    transforms: [new removeSdlFromQueryTransform()],
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
    subschemas: stitchMedleySubschemas(subschemas, options.getTypeNameFromId),
    mergeTypes: true,
  });
  //TODO: switch to remove internal fields once stitch supports batched interface merges again
  //return removeMedleyInternalFields(schema);
  return schema;
}

export function removeMedleyInternalFields(schema: GraphQLSchema) {
  const markerField = '_stitchedTypeMarker';
  return filterSchema({
    schema,
    objectFieldFilter: (_, fieldName) => fieldName !== markerField,
    interfaceFieldFilter: (_, fieldName) => fieldName !== markerField,
  });
}
