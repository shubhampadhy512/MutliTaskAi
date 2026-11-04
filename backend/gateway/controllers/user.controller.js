
export const GetUser = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }
        return res.status(200).json({
            message: 'User fetched successfully',
            data: user
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error"
        })
    }
}