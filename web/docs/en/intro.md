# DAT (Distributed Access Token)

---

## Background of DAT Introduction

Today, many systems adopt JWT, but structural limitations exist in actual production environments as follows.<br/>
To resolve these issues, the new token specification, DAT, was designed.

#### 🧩 Fragmentation of Security Specifications and Lack of Enforcement
JWT provides encryption standards such as JWE, but their use is not enforced. <br/>
As a result, many development environments omit encryption or transmit data using non-standard methods, leading to security vulnerabilities.

#### 🔑 Security Risks from Static Key Usage
Since signature key rolling is not mandatory, single keys are frequently used for long periods. This can lead to a complete system security collapse if a key is compromised; in fact, breach incidents caused by this have occurred on large-scale e-commerce sites.

#### 📉 Performance Degradation due to Overhead
JWT goes through a JSON parsing process for every request, which consumes significant CPU resources. In high-performance environments, this parsing cost can become a major bottleneck for the entire system.


## Core Philosophy of DAT

DAT is designed under the principles that security must be mandatory rather than optional, and performance cannot be compromised.

#### ⚡ Light and Fast

```expire```.```cid```.```plain```.```secure```.```signature```

DAT features a lightweight data structure as shown above.

#### 🔐 Enforced Security

DAT physically separates the plain text (Plain) and **encrypted (Secure)** regions during data transmission.<br/>
It enforces that sensitive information must be encrypted, and the entire process is protected by standardized algorithms (P256, AES-GCM, etc.) via `DatKey`.

#### 🔄 Enforced Key Rolling

`DatKey`, the core of the DAT system, directly manages **the key lifecycle** as well as token issuance and expiration.<br/>
It is designed to regularly rotate keys at the system level, fundamentally preventing 'static key security incidents' caused by administrator carelessness.

---

## Authentication Mechanism Comparison

| Classification | **DAT** | **JWT** | **Session** |
| --- |-------------------------------| --- |---------------------------|
| **Authentication Method** | **Distributed Verification** | Distributed Verification | Centralized          |
| **Data Structure** | **Raw Bytes<br/>(Fixed Offset-Based)** | JSON<br/>(Key-Value Text-Based) | Serialized Object<br/>(Object Serialization) |
| **Parsing Mechanism** | **Immediate Byte Data Mapping** | Requires JSON Parsing and Type Casting | Requires Object Deserialization and I/O          |
| **Processing Performance** | **Highest (Minimal Parsing Overhead)** | Moderate (Dependent on JSON Processing Performance) | Low (Network/Disk I/O)         |
| **Encryption** | **Built-in by Default** | Requires Separate JWE Implementation (Complex) | Not Applicable                     |
| **Key Management** | **Enforced System Rolling (Enforced Security)** | Requires Direct Implementation (Risk of Careless Management) | Not Applicable                     |
| **Key Validity Period** | **Enforced and Explicit in Key Spec** | Optional (Permanent if Unmanaged) | Managed by Central Server                  |
