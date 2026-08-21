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
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var user = await authService.ValidateCredentialsAsync(request, ct);
        return Ok(tokenService.Create(user));
    }
}
