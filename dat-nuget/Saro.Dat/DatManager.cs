using System.Text;

namespace Saro.Dat;

/// <summary>
/// Owns the certificates it holds: importing copies what the caller passes in,
/// and a certificate that leaves the held set is disposed. Dispose releases the
/// held certificates and the internal lock.
/// </summary>
public class DatManager : IDisposable
{
    // A reference into _certificates, not a separate copy: cloning it per import
    // allocated a fresh native ECDSA handle every CMS refresh.
    private DatCertificate? _issuer;
    private List<DatCertificate> _certificates = new();
    private Dictionary<long, DatCertificate> _certificatesByCid = new();
    private readonly ReaderWriterLockSlim _lock = new();
    // Guards Dispose itself, so it can't be the lock it is about to dispose.
    private int _disposed;

    /// <summary>
    /// 해제된 매니저 사용은 ReaderWriterLockSlim 의 ObjectDisposedException 이 아니라
    /// 이 체계의 코드로 보고한다.
    /// </summary>
    private void ThrowIfDisposed()
    {
        if (Volatile.Read(ref _disposed) != 0)
            throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatManager));
    }

    public string Issue(byte[] plain, byte[] secure)
    {
        ThrowIfDisposed();
        DatException failure;
        _lock.EnterReadLock();
        try
        {
            if (_issuer != null) return Issue(_issuer, plain, secure);

            // 예전에는 이 다섯 가지가 "Not Found IssuanceKey(SigningKey)" 한 문자열이었다.
            // 대응이 전부 다르다 — 발급창 전이면 기다리면 되고, verify-only 뿐이면
            // 배포 설정 실수이며, 0건이면 CMS 접속 문제다.
            failure = _certificates.Count == 0
                ? new DatException(DatErrorCode.ManagerNoCertificate)
                : new DatException(DatErrorCode.ManagerNoIssuableCertificate, null, NoIssuableCause(_certificates));
        }
        finally { _lock.ExitReadLock(); }
        throw failure;
    }

    /// <summary>
    /// 발급 가능한 인증서가 없을 때 <b>왜</b> 없는지 가려낸다. 락 안에서 호출된다.
    /// </summary>
    private static DatException NoIssuableCause(List<DatCertificate> certificates)
    {
        long now = Unixtime.Now();
        bool signableSeen = false, notYet = false, ended = false;

        foreach (var c in certificates)
        {
            if (!c.Signature.Signable()) continue;
            signableSeen = true;
            if (now < c.DatIssuanceStartSeconds) notYet = true;
            else if (now > c.DatIssuanceEndSeconds) ended = true;
        }

        if (!signableSeen) return new DatException(DatErrorCode.CertVerifyOnly);
        // 기다리면 풀리는 유일한 사유다. 하나라도 있으면 이것을 앞세운다.
        if (notYet) return new DatException(DatErrorCode.CertNotYetIssuable);
        if (ended) return new DatException(DatErrorCode.CertIssuanceEnded);
        return new DatException(DatErrorCode.CertExpired);
    }

    public string Issue(string plain, string secure) =>
        Issue(Encoding.UTF8.GetBytes(plain), Encoding.UTF8.GetBytes(secure));

    public Payload Parse(Dat dat)
    {
        ThrowIfDisposed();
        _lock.EnterReadLock();
        try
        {
            return Parse(FindUnsafe(dat.Cid), dat);
        }
        finally { _lock.ExitReadLock(); }
    }

    public Payload Parse(string datStr) => Parse(new Dat(datStr));

    public Payload ParseWithoutVerifying(Dat dat)
    {
        ThrowIfDisposed();
        _lock.EnterReadLock();
        try
        {
            return ParseWithoutVerifying(FindUnsafe(dat.Cid), dat);
        }
        finally { _lock.ExitReadLock(); }
    }

    public Payload ParseWithoutVerifying(string datStr) => ParseWithoutVerifying(new Dat(datStr));

    internal DatCertificate FindUnsafe(long cid) =>
        _certificatesByCid.TryGetValue(cid, out var certificate)
            ? certificate
            : throw new DatException(DatErrorCode.CertNotFound, $"cid {cid:x}");

    public List<long> ExportsIds()
    {
        ThrowIfDisposed();
        _lock.EnterReadLock();
        try { return _certificates.Select(c => c.Cid).ToList(); }
        finally { _lock.ExitReadLock(); }
    }

    public List<DatCertificate> ExportsCertificates()
    {
        ThrowIfDisposed();
        _lock.EnterReadLock();
        try { return _certificates.Select(c => (DatCertificate)c.Clone()).ToList(); }
        finally { _lock.ExitReadLock(); }
    }

    public string Exports(bool verifyOnly)
    {
        ThrowIfDisposed();
        _lock.EnterReadLock();
        try { return string.Join("\n", _certificates.Select(c => c.Exports(verifyOnly))); }
        finally { _lock.ExitReadLock(); }
    }

    public int Imports(string format, bool clear)
    {
        var certs = new List<DatCertificate>();
        try
        {
            if (!string.IsNullOrWhiteSpace(format))
            {
                foreach (var line in format.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                {
                    certs.Add(DatCertificate.Parse(line));
                }
            }

            if (certs.Count != certs.Select(c => c.Cid).Distinct().Count())
                throw new DatException(DatErrorCode.CertDuplicateCid);
        }
        catch
        {
            // Nothing else can reach the certificates parsed so far.
            foreach (var c in certs) c.Dispose();
            throw;
        }

        // Freshly parsed, so there is no second owner to copy away from.
        return ImportsOwned(certs, clear);
    }

    public int Imports(List<DatCertificate> certs, bool clear)
    {
        if (certs is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "certificate list is null");
        if (certs.Count != certs.Select(c => c.Cid).Distinct().Count())
            throw new DatException(DatErrorCode.CertDuplicateCid);

        // The manager owns what it stores, so it takes copies and the caller keeps
        // ownership of the instances it passed in.
        var owned = new List<DatCertificate>(certs.Count);
        try
        {
            foreach (var c in certs) owned.Add((DatCertificate)c.Clone());
        }
        catch
        {
            foreach (var c in owned) c.Dispose();
            throw;
        }

        return ImportsOwned(owned, clear);
    }

    /// <summary>
    /// Takes ownership of <paramref name="certs"/>: every element is either held
    /// by the manager when this returns or disposed.
    /// </summary>
    private int ImportsOwned(List<DatCertificate> certs, bool clear)
    {
        if (Volatile.Read(ref _disposed) != 0)
        {
            foreach (var c in certs) c.Dispose();
            throw new DatException(DatErrorCode.ManagerDisposed, nameof(DatManager));
        }

        var renewCount = 0;
        var evicted = new List<DatCertificate>();

        _lock.EnterWriteLock();
        try
        {
            List<DatCertificate> list;
            if (clear)
            {
                list = new List<DatCertificate>(certs.Count);
                foreach (var c in certs)
                {
                    if (c.Expired) evicted.Add(c);
                    else list.Add(c);
                }
                renewCount = list.Count;
                // Full replacement: everything held so far goes.
                evicted.AddRange(_certificates);
            }
            else
            {
                list = new List<DatCertificate>(_certificates);
                foreach (var nc in certs)
                {
                    // A CID already held wins: a re-issued certificate that keeps its
                    // CID is dropped rather than replacing the one in hand.
                    if (list.Any(c => c.Cid == nc.Cid))
                    {
                        evicted.Add(nc);
                        continue;
                    }
                    list.Add(nc);
                    renewCount++;
                }
                for (int i = list.Count - 1; i >= 0; i--)
                {
                    if (!list[i].Expired) continue;
                    evicted.Add(list[i]);
                    list.RemoveAt(i);
                }
            }

            _certificates = list.OrderBy(c => c.DatIssuanceEndSeconds).ToList();
            _certificatesByCid = _certificates.ToDictionary(c => c.Cid);
            _issuer = _certificates.LastOrDefault(c => c.Issuable);
        }
        finally { _lock.ExitWriteLock(); }

        // Outside the lock: disposal touches native handles only.
        foreach (var c in evicted) c.Dispose();

        return renewCount;
    }

    public void Dispose()
    {
        if (Interlocked.Exchange(ref _disposed, 1) != 0) return;

        List<DatCertificate> held;
        _lock.EnterWriteLock();
        try
        {
            held = _certificates;
            _certificates = new();
            _certificatesByCid = new();
            _issuer = null;
        }
        finally { _lock.ExitWriteLock(); }

        foreach (var c in held) c.Dispose();
        _lock.Dispose();
    }

    public static string Issue(DatCertificate certificate, byte[] plain, byte[] secure)
    {
        long expire = Unixtime.Now() + certificate.DatTtlSeconds;
        string header = $"{expire}.{certificate.Cid:x}.{DatUtils.EncodeBase64Url(plain)}.{DatUtils.EncodeBase64Url(certificate.Crypto.Encrypt(secure))}";
        byte[] signature = certificate.Signature.Sign(Encoding.UTF8.GetBytes(header));
        return $"{header}.{DatUtils.EncodeBase64Url(signature)}";
    }

    public static string Issue(DatCertificate certificate, string plain, string secure) =>
        Issue(certificate, Encoding.UTF8.GetBytes(plain), Encoding.UTF8.GetBytes(secure));

    public static Payload Parse(DatCertificate certificate, Dat dat)
    {
        // Verify 는 이제 백엔드 실패(SIG_BACKEND)와 해제된 키(MANAGER_DISPOSED)를
        // 예외로 올린다. false 는 오직 "서명이 안 맞는다" 뿐이므로 그때만 위조로 본다.
        if (!certificate.Signature.Verify(dat.Body, dat.SignatureBytes))
            throw new DatException(DatErrorCode.SigMismatch);

        return ParseWithoutVerifying(certificate, dat);
    }

    public static Payload Parse(DatCertificate certificate, string datStr) => Parse(certificate, new Dat(datStr));

    public static Payload ParseWithoutVerifying(DatCertificate certificate, Dat dat) =>
        new Payload(dat.PlainBytes, certificate.Crypto.Decrypt(dat.SecureBytes));

    public static Payload ParseWithoutVerifying(DatCertificate certificate, string datStr) =>
        ParseWithoutVerifying(certificate, new Dat(datStr));

    public static DatManager NewInstance() => new DatManager();

    internal static DatManager NewInstance(List<DatCertificate> certificates)
    {
        var manager = NewInstance();
        manager.Imports(certificates, true);
        return manager;
    }
}
