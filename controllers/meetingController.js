const MEETING = require('../schemas/meeting');
const MEETINGMEMBER = require('../schemas/meetingMember');
const USER = require('../schemas/user');
const BANNEDUSER = require('../schemas/bannedUsers');
const lib = require('../lib/util');

/*
    TODO 1. cookie에 유저 정보가 담기면 db에서 유저 검사 후 meetingMasterId 값으로 지정
         2. 모임은 한 사람당 하나만 만들 수 있기 때문에 만드려는 유저가 이미 만든 모임이 있는지 확인
         3. 기본 모임 이미지 협의 볼 것. url 형식이 아닐 수 있음.
         4. 카테고리, 지역 올바른 값인지 확인
 */
async function createMeeting(req, res) {
    // FIXME res.locals가 작업되면 바꾼다.
    const { userId } = req.query;
    const {
        meetingName,
        meetingCategory,
        meetingLocation,
        meetingIntro,
        meetingLimitCnt,
    } = req.body;

    const existMaster = await MEETING.find({ meetingMasterId: userId });
    if (existMaster.length) {
        return res
            .status(400)
            .json({ result: false, message: '이미 생성한 모임이 있습니다.' });
    }

    let meetingImage = '';
    if (req.file) {
        meetingImage = req.file.location;
    } else {
        meetingImage = 'https://img.lovepik.com/element/40135/2302.png_300.png';
    }

    await MEETING.create({
        meetingMasterId: userId,
        meetingName,
        meetingCategory,
        meetingLocation,
        meetingImage,
        meetingIntro,
        meetingLimitCnt,
        regDate: lib.getDate(),
    }).then(
        async (result) =>
            await MEETINGMEMBER.create({
                meetingMemberId: userId,
                meetingId: result.meetingId,
                isMeetingMaster: true,
                regDate: lib.getDate(),
            })
    );

    res.status(201).json({ result: true, message: '모임 생성 성공' });
}

async function getMeetingInfo(req, res) {
    const { meetingId } = req.params;

    // 모임 정보
    const meetingInfo = await MEETING.findOne({ meetingId });
    // 모임 마스터의 프로필 정보
    const meetingMasterProfile = await USER.findOne({
        userId: meetingInfo.meetingMasterId,
    });
    // 모임에 가입된 유저들
    const meetingUsers = await MEETINGMEMBER.find({ meetingId });
    // 모임에 가입된 유저들 고유 id
    const meetingUsersId = meetingUsers.map((result) => result.meetingMemberId);
    // 모임에 가입된 유저들 정보
    // TODO 현재는 모임 마스터 정보가 제일 위에 올라와서 skip(1)로 마스터 정보를 제외하고 limit(3)으로 3명만 정보가 나오게 되어있지만 기획에 따라 수정 필요
    const meetingUsersProfile = await USER.find(
        { userId: meetingUsersId },
        {
            userId: true,
            username: true,
            profileImage: true,
            statusMessage: true,
            _id: false,
        }
    )
        .skip(1)
        .limit(3);

    // TODO  isMeetingMaster, isMeetingJoined 추가
    res.status(200).json({
        result: true,
        message: '모임 페이지 모임정보 조회 성공',
        data: {
            meetingId: meetingInfo.meetingId,
            meetingName: meetingInfo.meetingName,
            meetingCategory: meetingInfo.meetingCategory,
            meetingLocation: meetingInfo.meetingLocation,
            meetingImage: meetingInfo.meetingImage,
            meetingIntro: meetingInfo.meetingIntro,
            meetingUserCnt: meetingUsers.length,
            meetingLimitCnt: meetingInfo.meetingLimitCnt,
            meetingMasterProfile: {
                userId: meetingMasterProfile.userId,
                nickname: meetingMasterProfile.username,
                profileImage: meetingMasterProfile.profileImage,
                statusMessage: meetingMasterProfile.statusMessage,
            },
            together: meetingUsersProfile,
        },
    });
}

async function getMeetingUsers(req, res) {
    const { meetingId } = req.params;
    // FIXME res.locals가 작업되면 바꾼다.
    const { userId } = req.query;

    const myProfile = await USER.findOne(
        { userId },
        {
            userId: true,
            username: true,
            profileImage: true,
            statusMessage: true,
            _id: false,
        }
    );
    const meetingMasterProfile = await MEETING.findOne({ meetingId }).then(
        async (result) => await USER.findOne({ userId: result.meetingMasterId })
    );

    const meetingUsers = await MEETINGMEMBER.find({ meetingId });
    const meetingUsersId = meetingUsers.map((result) => result.meetingMemberId);
    const meetingUsersProfile = await USER.find(
        { userId: meetingUsersId },
        {
            userId: true,
            username: true,
            profileImage: true,
            statusMessage: true,
            _id: false,
        }
    );

    res.status(200).json({
        result: true,
        message: '모임 가입 유저 조회 성공',
        data: {
            myProfile,
            meetingMasterProfile: {
                userId: meetingMasterProfile.userId,
                username: meetingMasterProfile.username,
                profileImage: meetingMasterProfile.profileImage,
            },
            meetingUsers: meetingUsersProfile,
        },
    });
}

async function inoutMeeting(req, res) {
    const { meetingId } = req.body;
    // FIXME res.locals가 작업되면 바꾼다.
    const { userId } = req.query;

    const existMeetingMember = await MEETINGMEMBER.findOne({
        meetingMemberId: userId,
        meetingId,
    });
    if (existMeetingMember.isMeetingMaster) {
        return res.status(400).json({
            result: false,
            message: '모임 마스터는 모임 참여, 탈퇴가 불가능합니다.',
        });
    }

    const bannedMeetingUser = await BANNEDUSER.findOne({ meetingId, userId });
    if (bannedMeetingUser) {
        return res.status(400).json({
            result: false,
            message: '강퇴당한 유저는 모임 참여가 불가능합니다.',
        });
    }

    if (!existMeetingMember) {
        await MEETINGMEMBER.create({
            meetingMemberId: userId,
            meetingId,
            regDate: lib.getDate(),
        });
        res.status(201).json({
            result: true,
            message: '모임 가입 성공',
        });
    } else {
        await MEETINGMEMBER.deleteOne({ meetingMemberId: userId, meetingId });
        res.status(201).json({
            result: true,
            message: '모임 탈퇴 성공',
        });
    }
}

// TODO 스터디 장을 내보내면 현재 진행 중인 스터디나 진행됐던 스터디는 어떻게 할지?
async function kickMeetingMember(req, res) {
    const { targetId, meetingId } = req.body; // targetId: 강퇴를 당하는 사람의 Id (밴 당하는 유저)
    // FIXME res.locals가 작업되면 바꾼다.
    const { userId } = req.query; // 강퇴를 하는 사람의 Id (모임 마스터)

    const meeting = await MEETING.findOne({ meetingId });
    // FIXME res.locals가 작업되면 넘어오는 값이 int인지 아닌지 확인 후 수정
    // 모임 마스터만 내보내기가 가능하다.
    if (parseInt(userId) !== meeting.meetingMasterId) {
        return res.status(400).json({
            result: false,
            message: '모임 마스터만 내보내기가 가능합니다.',
        });
    }

    // 내보내려는 유저가 모임 마스터면 내보내기가 불가능하다.
    if (targetId === meeting.meetingMasterId) {
        return res.status(400).json({
            result: false,
            message: '모임 마스터는 내보내기가 불가능합니다.',
        });
    }

    const kickMeetingMember = await MEETINGMEMBER.deleteOne({
        meetingId,
        meetingMemberId: targetId,
        isMeetingMaster: false,
    });
    if (kickMeetingMember.deletedCount) {
        await BANNEDUSER.create({
            meetingId,
            userId: targetId,
            regDate: lib.getDate(),
        });
    }

    res.status(201).json({
        result: true,
        message: '모임 유저 내보내기 성공',
    });
}

module.exports = {
    createMeeting,
    getMeetingInfo,
    getMeetingUsers,
    inoutMeeting,
    kickMeetingMember,
};
