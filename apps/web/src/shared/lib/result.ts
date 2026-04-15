/**
 * Result<T, E> — Functional error-handling monad
 * ─────────────────────────────────────────────────────────
 * Used in the domain layer instead of throwing exceptions.
 * Forces callers to explicitly handle success and failure paths.
 *
 * Usage:
 *   function divide(a: number, b: number): Result<number, string> {
 *     if (b === 0) return Result.fail("Cannot divide by zero");
 *     return Result.ok(a / b);
 *   }
 *
 *   const result = divide(10, 2);
 *   if (result.isOk()) {
 *     console.log(result.value); // 5
 *   } else {
 *     console.log(result.error); // "Cannot divide by zero"
 *   }
 */

export class Result<T, E = string> {
    public readonly isSuccess: boolean;
    public readonly isFailure: boolean;
    private readonly _value?: T;
    private readonly _error?: E;

    private constructor(isSuccess: boolean, value?: T, error?: E) {
        if (isSuccess && error !== undefined) {
            throw new Error("Result: A success result cannot have an error");
        }
        if (!isSuccess && value !== undefined) {
            throw new Error("Result: A failure result cannot have a value");
        }

        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this._value = value;
        this._error = error;

        Object.freeze(this);
    }

    /**
     * Get the value. Throws if the result is a failure.
     */
    get value(): T {
        if (this.isFailure) {
            throw new Error("Cannot access value of a failed result. Check isSuccess first.");
        }
        return this._value as T;
    }

    /**
     * Get the error. Throws if the result is a success.
     */
    get error(): E {
        if (this.isSuccess) {
            throw new Error("Cannot access error of a successful result. Check isFailure first.");
        }
        return this._error as E;
    }

    /**
     * Type guard for success.
     */
    isOk(): this is Result<T, never> {
        return this.isSuccess;
    }

    /**
     * Type guard for failure.
     */
    isFail(): this is Result<never, E> {
        return this.isFailure;
    }

    /**
     * Map the success value to a new value.
     */
    map<U>(fn: (value: T) => U): Result<U, E> {
        return this.isOk() ? Result.ok(fn(this.value)) : Result.fail(this.error);
    }

    /**
     * FlatMap / bind — chain Result-returning functions.
     */
    flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
        return this.isOk() ? fn(this.value) : Result.fail(this.error);
    }

    /**
     * Map the error to a new error.
     */
    mapError<F>(fn: (error: E) => F): Result<T, F> {
        return this.isFail() ? Result.fail(fn(this.error)) : Result.ok(this.value);
    }

    /**
     * Get the value or a default.
     */
    getOrDefault(defaultValue: T): T {
        return this.isOk() ? this.value : defaultValue;
    }

    /**
     * Get the value or execute an alternative.
     */
    getOrElse(fn: (error: E) => T): T {
        return this.isOk() ? this.value : fn(this.error);
    }

    /**
     * Create a successful result.
     */
    static ok<T, E = string>(value: T): Result<T, E> {
        return new Result<T, E>(true, value);
    }

    /**
     * Create a failed result.
     */
    static fail<T, E = string>(error: E): Result<T, E> {
        return new Result<T, E>(false, undefined, error);
    }

    /**
     * Wrap a function that may throw into a Result.
     */
    static fromThrowable<T>(fn: () => T): Result<T, Error> {
        try {
            return Result.ok(fn());
        } catch (e) {
            return Result.fail(e instanceof Error ? e : new Error(String(e)));
        }
    }

    /**
     * Wrap an async function that may throw into a Result.
     */
    static async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
        try {
            return Result.ok(await promise);
        } catch (e) {
            return Result.fail(e instanceof Error ? e : new Error(String(e)));
        }
    }

    /**
     * Combine multiple results. Returns the first failure, or all successes.
     */
    static combine<T>(results: Result<T>[]): Result<T[]> {
        const values: T[] = [];
        for (const result of results) {
            if (result.isFailure) {
                return Result.fail(result.error);
            }
            values.push(result.value);
        }
        return Result.ok(values);
    }
}
