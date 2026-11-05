
import proxy from "express-http-proxy";

export const proxyWithHeader = (servicesUrl) => {
    return proxy(servicesUrl, {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
            }

            return proxyReqOpts;
        }
    });
};
