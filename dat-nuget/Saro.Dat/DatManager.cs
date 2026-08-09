using System.Text;

namespace Saro.Dat;

public class DatManager : IDisposable
{
    private DatCertificate? _issuer;
    private List<DatCertificate> _certificates = new();
    private Dictionary<long, DatCertificate> _certificatesByCid = new();
    private readonly ReaderWriterLockSlim _lock = new();
    private int _disposed;

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

            failure = _certificates.Count == 0
                ? new DatException(DatErrorCode.ManagerNoCertificate)
                : new DatException(DatErrorCode.ManagerNoIssuableCertificate, null, NoIssuableCause(_certificates));
        }
        finally { _lock.ExitReadLock(); }
        throw failure;
    }

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
            foreach (var c in certs) c.Dispose();
            throw;
        }

        return ImportsOwned(certs, clear);
    }

    public int Imports(List<DatCertificate> certs, bool clear)
    {
        if (certs is null)
            throw new DatException(DatErrorCode.ConfigArgumentInvalid, "certificate list is null");
        if (certs.Count != certs.Select(c => c.Cid).Distinct().Count())
            throw new DatException(DatErrorCode.CertDuplicateCid);

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
                evicted.AddRange(_certificates);
            }
            else
            {
                list = new List<DatCertificate>(_certificates);
                foreach (var nc in certs)
                {
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
