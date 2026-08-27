using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService, JwtTokenService tokenService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginStartResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await authService.BeginLoginAsync(request, ct);
        if (result.User is not null)
            return Ok(new LoginStartResponse(false, null, null, tokenService.Create(result.User)));
        return Ok(new LoginStartResponse(true, result.Challenge!.PendingToken, result.Challenge.ExpiresAt, null));
    }

    [AllowAnonymous]
    [HttpPost("verify-otp")]
    public async Task<ActionResult<LoginResponse>> VerifyOtp(VerifyOtpRequest request, CancellationToken ct)
    {
        var user = await authService.VerifyOtpAsync(request, ct);
        return Ok(tokenService.Create(user));
    }

    [AllowAnonymous]
    [HttpPost("resend-otp")]
    public async Task<ActionResult<LoginOtpResponse>> ResendOtp(ResendOtpRequest request, CancellationToken ct) =>
        Ok(await authService.ResendOtpAsync(request, ct));
}
