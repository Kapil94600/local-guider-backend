import admin from "firebase-admin";

const serviceAccount = {
  type: "service_account",
  project_id: "localguider-a84f3",
  private_key_id: "bd5cf959397305112b3f5456496836a591cf7880",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDHBj2wusCkXeCc
BI7lpw+zU33s0ZwAwWmWnuFaQGyvSThsyz2Kfj/jHugOzuiMTGM4+V6r+ElBOADL
KPvGQzESd8RjCr0bf3yWON0OrU3jCggwH8lXbPI7WhDSolrk+lDo665vMTDfVTnG
Fos/zg+BBhPLzztN2giZoay4j06M71LUffKdSsUc2EInQzSeKXG50O/jY3Ir6JaW
8Fx9YJtvzJSfSZrJujkL8OoedPrUb4zrZulO/xqPn5jFw0KU9LJCBBKWC7lgA/FA
liuD8DIShFhBJWFu0QIEG6H+RrYeGlWe7o5zPCZ9/xoSm8c+Nyq5zr4/ctW38hUe
mJuiG6U1AgMBAAECggEAHJjWOORgpU1y5mAWS0PJsv3qcGJ+7LHd0t1h6oaqxzX5
ZFKAtXtmASOx+ty6l9wq/qcANiwPFI6wOIDbSnXhoXJxlryWhxK2q1wg0UjQEfEh
U47hrozyMlqC480dy9x2zzz8G7CBAfocOs0G9aRNYH/nzMdqUUmkpjSPnZZD1maU
3ZJIrZHiRP0QQfnAO3NICJ4BRbZgsuWYBQ33Kx2bbMdYZnbPAxISfN94aNEkliw0
W3mOfe1iqe243qYjLdGR5SIdie3Xrd2wp/dbMoOLTSHBwpLTPpP/YRC7jGw71PY+
5y+CJnrPAyFMiyhqLR35RK28m5arktMJbp0Ut8E6CQKBgQDzir5YXq1wqw0p5s9d
mgINbt0ZQb6Qtb8JavcY9dl/TP49VbztQaLFhVmfzSsYc/3zr+GiGrOislMtOVIe
yEubjUkeq9Td/BWN9Q3pQqxA7eBpNhhNBr98ldTiiROStdMrgjffiuVBIqTcQyh7
yU7NxrMEs5anuVwrAgsVv0g6yQKBgQDRNIapjBlAw/5Ys3KFxfyhFt7hnYO689cW
EU/SzxRfOfC/C9wWb/SOlW28ecQ8VsH8TjhIWnJCdON2RSCLx127L9qEc+Yj11L0
H0DdbxLIJjVw2itH8/q2sjeI0TxY6PqzrhIUMdR8oECz4OsSfQZ5aKigc7R1BFpN
l9iRDpbhDQKBgFAGtDtXiQhvvJibNmKce7YsSszE1Li6b/bJRj7WckypYRWIeddA
bRsYkXW4NkQHwVf04GCjA4ofrMM8haaFzIplp7RDZGQ5NF/8OUD/3phLUiVgWCXf
ZMaseVKjFmJsCuLOHEwBWQnJN4EFNGVQpetqMmMGHCgq+YVMW5Yez745AoGAe3+m
fzBVOAZ7f6FvWckm+XGm4Uk7GoIX1s8hcDEOtahelmlJ43Tzybgsr7ayQWx115vV
XeEG0nRuUsM8E0f97SKyvL4ufbn/Hl3UzONlEwJ7ScOBCVjeCDvszLe4CESAutFn
msRPy8JOb+G245Mq30EJSq8DOJD5PhUFo5wZNYECgYAMqp6KzhSZSs1lg5VK3whm
P8Ljp83O95QfDfT9+TNv/c20i01jucjYgCqtnvI4TcpfpRiLTf75QwgnX2QpQCo4
XUnzkO+pe2QiB+CjOSFsoPl/cin4QI2Skz6dJe/NHgwSl3Tev/8yUNVMOiIV/YXx
St4Xis1zNjAJugS1BRXrHA==
-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@localguider-a84f3.iam.gserviceaccount.com",
  client_id: "102050818953327816816",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40localguider-a84f3.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin configured");
} catch (error) {
  console.error("❌ Firebase Admin not configured:", error.message);
}

export default admin;