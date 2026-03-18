using System.Diagnostics;
using System.IO.Compression;
using System.Text;

const string AppDisplayName = "Riskcare Cowork";
const string AppExecutableName = "eigent.exe";
const string PayloadName = "riskcare-app.zip";
const string EmbeddedPayloadMarker = "RISKCARE_PAYLOAD_V1";

Console.Title = $"{AppDisplayName} - Instalador";
Console.WriteLine("=========================================");
Console.WriteLine($"  Instalador de {AppDisplayName}");
Console.WriteLine("=========================================");

EmbeddedPayloadInfo? embeddedPayload = null;
var payloadPath = Path.Combine(AppContext.BaseDirectory, PayloadName);
if (!File.Exists(payloadPath))
{
    Console.WriteLine($"No se encontro el archivo '{PayloadName}' junto al instalador.");

    if (TryGetEmbeddedPayloadInfo(out var payloadInfo))
    {
        embeddedPayload = payloadInfo;
        Console.WriteLine("Se detecto paquete embebido en el instalador (modo un solo .exe).");
    }
    else
    {
        Console.WriteLine("Coloca el .zip al lado del .exe o usa un instalador de archivo unico.");
        PauseAndExit(1);
        return;
    }
}

var defaultInstallDir = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "Programs",
    "RiskcareCowork");

Console.WriteLine();
Console.WriteLine("Ruta de instalacion.");
Console.WriteLine($"Predeterminada: {defaultInstallDir}");
Console.Write("Presiona Enter para usarla o escribe una ruta: ");
var inputPath = Console.ReadLine()?.Trim();
var installDir = string.IsNullOrWhiteSpace(inputPath) ? defaultInstallDir : inputPath;

try
{
    if (Directory.Exists(installDir))
    {
        Console.WriteLine();
        Console.WriteLine($"La carpeta ya existe: {installDir}");
        Console.Write("Deseas reemplazarla? (s/N): ");
        var answer = (Console.ReadLine() ?? string.Empty).Trim().ToLowerInvariant();
        if (answer != "s" && answer != "si" && answer != "y" && answer != "yes")
        {
            Console.WriteLine("Instalacion cancelada.");
            PauseAndExit(0);
            return;
        }

        DeleteDirectoryWithRetry(installDir, retries: 6, delayMs: 500);
    }

    Directory.CreateDirectory(installDir);

    Console.WriteLine();
    Console.WriteLine("Extrayendo archivos...");

    if (embeddedPayload is EmbeddedPayloadInfo payloadInfo)
    {
        ExtractEmbeddedPayloadToDirectory(payloadInfo, installDir);
    }
    else
    {
        ZipFile.ExtractToDirectory(payloadPath, installDir, overwriteFiles: true);
    }

    var appExe = Path.Combine(installDir, AppExecutableName);
    if (!File.Exists(appExe))
    {
        throw new FileNotFoundException($"No se encontro {AppExecutableName} despues de extraer el paquete.", appExe);
    }

    CreateShortcuts(appExe, installDir);

    Console.WriteLine();
    Console.WriteLine("Instalacion completada.");
    Console.WriteLine($"Aplicacion instalada en: {installDir}");
    Console.WriteLine("Se crearon accesos directos en Escritorio y Menu Inicio.");

    Console.Write("Abrir la aplicacion ahora? (S/n): ");
    var launchAnswer = (Console.ReadLine() ?? string.Empty).Trim().ToLowerInvariant();
    if (launchAnswer == string.Empty || launchAnswer == "s" || launchAnswer == "si" || launchAnswer == "y" || launchAnswer == "yes")
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = appExe,
            WorkingDirectory = installDir,
            UseShellExecute = true,
        });
    }

    PauseAndExit(0);
}
catch (Exception ex)
{
    Console.WriteLine();
    Console.WriteLine("Ocurrio un error durante la instalacion:");
    Console.WriteLine(ex.Message);
    PauseAndExit(1);
}

static void CreateShortcuts(string appExe, string installDir)
{
    var desktopShortcut = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
        $"{AppDisplayName}.lnk");

    var startMenuFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
        "Programs",
        AppDisplayName);
    Directory.CreateDirectory(startMenuFolder);

    var startMenuShortcut = Path.Combine(startMenuFolder, $"{AppDisplayName}.lnk");

    CreateShortcut(desktopShortcut, appExe, installDir, appExe);
    CreateShortcut(startMenuShortcut, appExe, installDir, appExe);
}

static void CreateShortcut(string shortcutPath, string targetPath, string workingDirectory, string iconPath)
{
    var shellType = Type.GetTypeFromProgID("WScript.Shell");
    if (shellType == null)
    {
        throw new InvalidOperationException("No se pudo crear accesos directos: WScript.Shell no disponible.");
    }

    dynamic? shell = Activator.CreateInstance(shellType);
    if (shell == null)
    {
        throw new InvalidOperationException("No se pudo inicializar WScript.Shell.");
    }

    dynamic shortcut = shell.CreateShortcut(shortcutPath);
    shortcut.TargetPath = targetPath;
    shortcut.WorkingDirectory = workingDirectory;
    shortcut.IconLocation = iconPath;
    shortcut.Description = AppDisplayName;
    shortcut.Save();
}

static void DeleteDirectoryWithRetry(string path, int retries, int delayMs)
{
    Exception? lastError = null;
    for (var i = 0; i < retries; i++)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
            return;
        }
        catch (Exception ex)
        {
            lastError = ex;
            Thread.Sleep(delayMs);
        }
    }

    throw new IOException($"No se pudo limpiar la carpeta de instalacion: {path}", lastError);
}

static bool TryGetEmbeddedPayloadInfo(out EmbeddedPayloadInfo payloadInfo)
{
    payloadInfo = default;

    var installerPath = Environment.ProcessPath;
    if (string.IsNullOrWhiteSpace(installerPath) || !File.Exists(installerPath))
    {
        return false;
    }

    var markerBytes = Encoding.ASCII.GetBytes(EmbeddedPayloadMarker);
    var footerSize = markerBytes.Length + sizeof(long);

    using var installerStream = new FileStream(installerPath, FileMode.Open, FileAccess.Read, FileShare.Read);
    if (installerStream.Length <= footerSize)
    {
        return false;
    }

    installerStream.Seek(-footerSize, SeekOrigin.End);
    var footer = new byte[footerSize];
    var read = installerStream.Read(footer, 0, footer.Length);
    if (read != footer.Length)
    {
        return false;
    }

    for (var i = 0; i < markerBytes.Length; i++)
    {
        if (footer[i] != markerBytes[i])
        {
            return false;
        }
    }

    var payloadLength = BitConverter.ToInt64(footer, markerBytes.Length);
    if (payloadLength <= 0)
    {
        return false;
    }

    var payloadStart = installerStream.Length - footerSize - payloadLength;
    if (payloadStart < 0)
    {
        return false;
    }

    payloadInfo = new EmbeddedPayloadInfo(installerPath, payloadStart, payloadLength);
    return true;
}

static void ExtractEmbeddedPayloadToDirectory(EmbeddedPayloadInfo payloadInfo, string installDir)
{
    using var installerStream = new FileStream(payloadInfo.InstallerPath, FileMode.Open, FileAccess.Read, FileShare.Read);
    using var payloadStream = new BoundedStream(installerStream, payloadInfo.PayloadStart, payloadInfo.PayloadLength, leaveOpen: false);
    using var zip = new ZipArchive(payloadStream, ZipArchiveMode.Read, leaveOpen: false);
    zip.ExtractToDirectory(installDir, overwriteFiles: true);
}

static void PauseAndExit(int code)
{
    Console.WriteLine();
    Console.WriteLine("Presiona Enter para cerrar...");
    Console.ReadLine();
    Environment.Exit(code);
}

readonly record struct EmbeddedPayloadInfo(string InstallerPath, long PayloadStart, long PayloadLength);

sealed class BoundedStream(Stream baseStream, long start, long length, bool leaveOpen) : Stream
{
    private readonly Stream _baseStream = baseStream;
    private readonly long _start = start;
    private readonly long _length = length;
    private readonly bool _leaveOpen = leaveOpen;
    private long _position;

    public override bool CanRead => _baseStream.CanRead;
    public override bool CanSeek => _baseStream.CanSeek;
    public override bool CanWrite => false;
    public override long Length => _length;

    public override long Position
    {
        get => _position;
        set => Seek(value, SeekOrigin.Begin);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && !_leaveOpen)
        {
            _baseStream.Dispose();
        }

        base.Dispose(disposing);
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        if (_position >= _length)
        {
            return 0;
        }

        var remaining = _length - _position;
        if (count > remaining)
        {
            count = (int)remaining;
        }

        _baseStream.Position = _start + _position;
        var read = _baseStream.Read(buffer, offset, count);
        _position += read;
        return read;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        long target = origin switch
        {
            SeekOrigin.Begin => offset,
            SeekOrigin.Current => _position + offset,
            SeekOrigin.End => _length + offset,
            _ => throw new ArgumentOutOfRangeException(nameof(origin)),
        };

        if (target < 0 || target > _length)
        {
            throw new IOException("Intento de posicion fuera de limites del payload embebido.");
        }

        _position = target;
        return _position;
    }

    public override void Flush() => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
}
