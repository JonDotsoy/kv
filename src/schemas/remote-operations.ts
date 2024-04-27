import {
  string,
  object,
  union,
  z,
  intersection,
  any,
  array,
  unknown,
} from "zod";

export namespace schemas {
  export namespace operations {
    const common = object({
      id: string().describe("Unique ID to identify operation"),
    });

    export const set = common.and(
      object({
        set: object({
          key: string(),
          value: string(),
        }),
      }),
    );

    export const get = common.and(
      object({
        get: object({
          key: string(),
        }),
      }),
    );

    /** Alias to delete operation */
    export const del = common.and(
      object({
        delete: object({
          key: string(),
        }),
      }),
    );

    export const enqueue = common.and(
      object({
        enqueue: object({
          channel: string(),
          value: string(),
        }),
      }),
    );

    export const dequeue = common.and(
      object({
        dequeue: object({
          channel: string(),
        }),
      }),
    );

    export const publish = common.and(
      object({
        publish: object({
          channel: string(),
          value: string(),
        }),
      }),
    );

    export const subscribe = common.and(
      object({
        subscribe: object({
          channel: string(),
        }),
      }),
    );
  }

  export const operation = union([
    operations.set,
    operations.get,
    operations.del,
    operations.enqueue,
    operations.dequeue,
    operations.subscribe,
    operations.publish,
  ]);

  export const bulk = array(operation);

  export namespace resultsOperation {
    const common = object({ id: string() });

    export const error = common.and(object({ error: string() }));
    export const value = common.and(object({ value: unknown() }));
  }

  export const resultOperation = union([
    resultsOperation.value,
    resultsOperation.error,
  ]);
}

export namespace types {
  export namespace operations {
    export type set = z.infer<typeof schemas.operations.set>;
    export type get = z.infer<typeof schemas.operations.get>;
    export type del = z.infer<typeof schemas.operations.del>;
    export type enqueue = z.infer<typeof schemas.operations.enqueue>;
    export type dequeue = z.infer<typeof schemas.operations.dequeue>;
    export type publish = z.infer<typeof schemas.operations.publish>;
    export type subscribe = z.infer<typeof schemas.operations.subscribe>;
  }

  export type operation = z.infer<typeof schemas.operation>;
  export type bulk = z.infer<typeof schemas.bulk>;

  export namespace resultsOperation {
    export type error = z.infer<typeof schemas.resultsOperation.error>;
    export type value = z.infer<typeof schemas.resultsOperation.value>;
  }

  export type resultOperation = z.infer<typeof schemas.resultOperation>;
}
