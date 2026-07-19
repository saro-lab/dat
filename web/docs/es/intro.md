# DAT (Distributed Access Token)

---

## Contexto de la Introducción de DAT

Hoy en día, muchos sistemas adoptan JWT, pero existen limitaciones estructurales en los entornos de producción reales.<br/>
Para resolver estos problemas, se diseñó la nueva especificación de token, DAT.

#### 🧩 Fragmentación de Especificaciones de Seguridad y Falta de Aplicación
JWT proporciona estándares de cifrado como JWE, pero su uso no es obligatorio.<br/>
Como resultado, muchos entornos de desarrollo omiten el cifrado o transmiten datos mediante métodos no estándar, lo que genera vulnerabilidades de seguridad.

#### 🔑 Riesgos de Seguridad por el Uso de Claves Estáticas
Dado que la rotación de claves de firma no es obligatoria, las claves únicas se utilizan con frecuencia durante largos períodos. Esto puede llevar a un colapso total de la seguridad del sistema si una clave se ve comprometida; de hecho, han ocurrido incidentes de brecha en sitios de comercio electrónico a gran escala por esta razón.

#### 📉 Degradación del Rendimiento por Sobrecarga
JWT realiza un proceso de análisis JSON para cada solicitud, lo que consume recursos significativos de CPU. En entornos de alto rendimiento, este costo de análisis puede convertirse en un cuello de botella importante para todo el sistema.


## Filosofía Central de DAT

DAT está diseñado bajo los principios de que la seguridad debe ser obligatoria en lugar de opcional, y que el rendimiento no puede comprometerse.

#### ⚡ Ligero y Rápido

```expire```.```cid```.```plain```.```secure```.```signature```

DAT cuenta con una estructura de datos ligera como la que se muestra arriba.

#### 🔐 Seguridad Aplicada

DAT separa físicamente las regiones de texto plano (Plain) y **cifrado (Secure)** durante la transmisión de datos.<br/>
Aplica que la información sensible debe estar cifrada, y todo el proceso está protegido por algoritmos estandarizados (P256, AES-GCM, etc.) a través de `DatKey`.

#### 🔄 Rotación de Claves Aplicada

`DatKey`, el núcleo del sistema DAT, gestiona directamente **el ciclo de vida de las claves**, así como la emisión y expiración de tokens.<br/>
Está diseñado para rotar claves regularmente a nivel del sistema, previniendo fundamentalmente los 'incidentes de seguridad de claves estáticas' causados por descuido del administrador.

---

## Comparación de Mecanismos de Autenticación

| Clasificación | **DAT** | **JWT** | **Sesión** |
| --- |-------------------------------| --- |---------------------------|
| **Método de Autenticación** | **Verificación Distribuida** | Verificación Distribuida | Centralizado |
| **Estructura de Datos** | **Raw Bytes<br/>(Basado en Offset Fijo)** | JSON<br/>(Basado en Texto Clave-Valor) | Objeto Serializado<br/>(Serialización de Objetos) |
| **Mecanismo de Análisis** | **Mapeo Inmediato de Datos en Bytes** | Requiere Análisis JSON y Conversión de Tipos | Requiere Deserialización de Objetos e I/O |
| **Rendimiento de Procesamiento** | **Más Alto (Mínima Sobrecarga de Análisis)** | Moderado (Dependiente del Rendimiento de Procesamiento JSON) | Bajo (I/O de Red/Disco) |
| **Cifrado** | **Integrado por Defecto** | Requiere Implementación JWE Separada (Complejo) | No Aplica |
| **Gestión de Claves** | **Rotación Forzada del Sistema (Seguridad Aplicada)** | Requiere Implementación Directa (Riesgo de Gestión Descuidada) | No Aplica |
| **Período de Validez de la Clave** | **Forzado y Explícito en la Especificación de Clave** | Opcional (Permanente si No se Gestiona) | Gestionado por Servidor Central |
