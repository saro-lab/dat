use crate::api_response::ApiResponse;
use crate::error::{ApiError, ApiResult};
use reqwest::{RequestBuilder, Response};
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::net::IpAddr;

#[allow(dead_code)]
pub trait RequestBuilderExt {
    fn ip(self, ip: IpAddr) -> Self;
    fn result(self) -> impl Future<Output = ApiResult<Response>>;
    fn api_response<T: DeserializeOwned>(self) -> impl Future<Output = ApiResponse<T>>;
    fn json_result(self) -> impl Future<Output = ApiResult<Value>>;
    fn json_vec_result(self) -> impl Future<Output = ApiResult<Vec<Value>>>;
}

impl RequestBuilderExt for RequestBuilder {
    fn ip(self, ip: IpAddr) -> Self {
        self.header("X-Forwarded-For", ip.to_string())
    }

    async fn result(self) -> ApiResult<Response> {
        let result = self
            .send().await?;

        if result.status().is_success() {
            Ok(result)
        } else {
            let err = result.json::<Value>().await?;
            Err(ApiError::Etc(err.to_string()))
        }
    }

    async fn api_response<T: DeserializeOwned>(self) -> ApiResponse<T> {
        if let Ok(response) = self.send().await {
            if let Ok(api_response) = response.json::<ApiResponse<T>>().await {
                return api_response;
            }
        }
        ApiResponse::code("error", None)
    }

    async fn json_result(self) -> ApiResult<Value> {
        let result = self
            .result().await?
            .json::<Value>().await?;
        Ok(result)
    }

    async fn json_vec_result(self) -> ApiResult<Vec<Value>> {
        let result = self
            .result().await?
            .json::<Vec<Value>>().await?;
        Ok(result)
    }
}
