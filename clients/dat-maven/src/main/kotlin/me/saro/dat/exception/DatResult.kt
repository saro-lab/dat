package me.saro.dat.exception


class DatResult<out T> private constructor(
    val value: T?,
    val exception: Throwable?,
    val result: Result<T>?
) {
    val isSuccess: Boolean get() = exception == null && value != null
    val isFailure: Boolean get() = exception != null

    fun getOrNull(): T? = value
    fun getOrThrow(): T = value ?: throw exception!!
    fun getOrElse(or: () -> @UnsafeVariance T): T = value ?: or()
    fun exceptionOrNull(): Throwable? = exception

    fun toResult(): Result<T> = result ?: if (isSuccess) Result.success(value!!) else Result.failure(exception!!)

    fun <R> map(onSuccess: (value: T) -> R?): DatResult<R> {
        return try {
            return if (isSuccess) {
                val v = onSuccess(value!!)
                if (v == null) {
                    failure(DatException.IS_NULL)
                } else {
                    success(v)
                }
            } else {
                failure(exception)
            }
        } catch (e: Exception) {
            failure(e)
        }
    }

    fun <R> fold(onSuccess: (value: T) -> DatResult<R>): DatResult<R> {
        return try {
            if (isSuccess) {
                onSuccess(value!!)
            } else {
                failure(exception!!)
            }
        } catch (e: Exception) {
            failure(e)
        }
    }

    fun <R> fold(onSuccess: (value: T) -> DatResult<R>, onFailure: (exception: Throwable) -> DatResult<R>): DatResult<R> {
        return try {
            if (isSuccess) {
                onSuccess(value!!)
            } else {
                onFailure(exception!!)
            }
        } catch (e: Exception) {
            failure(e)
        }
    }

    companion object {
        fun <T> parse(result: Result<T>): DatResult<T> = result.fold(
            onSuccess = { value -> of(value, null, result) },
            onFailure = { exception -> of(null, exception, result) }
        )
        @JvmStatic
        fun <T> success(value: T?): DatResult<T> {
            return of(value, null)
        }
        @JvmStatic
        fun <T> failure(exception: Throwable?): DatResult<T> {
            return of(null, exception)
        }
        fun <T> of(success: T?, failure: Throwable?, result: Result<T>? = null): DatResult<T> {
            return if (failure != null) {
                DatResult(null, failure, result)
            } else if (success != null) {
                DatResult(success, null, result)
            } else {
                DatResult(null, DatException.IS_NULL, result)
            }
        }
        inline fun <R> runCatching(block: () -> R): DatResult<R> {

            return try {
                success(block())
            } catch (e: Throwable) {
                failure(e)
            }
        }
        inline fun <R> runCatchingResult(block: () -> DatResult<R>): DatResult<R> {
            return try {
                block()
            } catch (e: Throwable) {
                failure(e)
            }
        }
    }
}
